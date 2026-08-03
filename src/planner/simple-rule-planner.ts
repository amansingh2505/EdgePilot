import { IPlanner } from './planner';
import { PlanningRequest, PlanResult, PlanModel, PlanStep } from './types';
import { ToolCapabilityResolver } from './tool-capability-resolver';
import { WorkflowGenerator } from './workflow-generator';
import { PlanValidator } from './plan-validator';
import { PlanOptimizer } from './plan-optimizer';
import { WorkflowCompiler } from './workflow-compiler';
import { v4 as uuidv4 } from 'uuid';
import { MemoryManagerInterface, MemoryContextIds, VariableStore } from '../memory/types';
import { ProviderManager } from '../llm/manager';
import { ILLMProvider } from '../llm/provider';

interface PlannerMemoryScope {
  session?: VariableStore;
  conversation?: VariableStore;
  workflow?: VariableStore;
}

export class SimpleRulePlanner implements IPlanner {
  constructor(
    private resolver: ToolCapabilityResolver,
    private memoryManager: MemoryManagerInterface,
    private providerManager: ProviderManager
  ) {}

  private async loadMemoryContext(ids?: MemoryContextIds): Promise<PlannerMemoryScope> {
    if (!ids) return {};

    const scope: PlannerMemoryScope = {};
    if (ids.session) scope.session = this.memoryManager.session(ids.session);
    if (ids.conversation) scope.conversation = this.memoryManager.conversation(ids.conversation);
    if (ids.workflow) scope.workflow = this.memoryManager.workflow(ids.workflow);
    return scope;
  }

  private async lookupMemoryValue(key: string, memory: PlannerMemoryScope): Promise<any> {
    if (memory.workflow) {
      const value = await memory.workflow.getVariable(key);
      if (value !== undefined) return value;
    }
    if (memory.conversation) {
      const value = await memory.conversation.getVariable(key);
      if (value !== undefined) return value;
    }
    if (memory.session) {
      const value = await memory.session.getVariable(key);
      if (value !== undefined) return value;
    }
    return undefined;
  }

  private async interpolateString(value: string, memory: PlannerMemoryScope): Promise<string> {
    const placeholderRegex = /\$\{([^}]+)\}/g;
    let result = '';
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = placeholderRegex.exec(value)) !== null) {
      result += value.slice(lastIndex, match.index);
      const key = match[1].trim();
      const memoryValue = await this.lookupMemoryValue(key, memory);
      result += memoryValue === undefined || memoryValue === null ? '' : String(memoryValue);
      lastIndex = placeholderRegex.lastIndex;
    }

    result += value.slice(lastIndex);
    return result;
  }

  private async interpolateObject(obj: any, memory: PlannerMemoryScope): Promise<any> {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'string') return await this.interpolateString(obj, memory);
    if (Array.isArray(obj)) return await Promise.all(obj.map((entry) => this.interpolateObject(entry, memory)));
    if (typeof obj === 'object') {
      const result: any = {};
      for (const key of Object.keys(obj)) {
        result[key] = await this.interpolateObject(obj[key], memory);
      }
      return result;
    }
    return obj;
  }

  private async injectMemory(request: PlanningRequest, memory: PlannerMemoryScope): Promise<PlanningRequest> {
    const prompt = await this.interpolateString(request.prompt, memory);
    const constraints = request.constraints ? await this.interpolateObject(request.constraints, memory) : undefined;
    return {
      ...request,
      prompt,
      constraints,
    };
  }

  private async writePlanMetadata(plan: PlanModel, request: PlanningRequest, memory: PlannerMemoryScope): Promise<void> {
    const metadata = {
      planId: plan.id,
      name: plan.name,
      generatedAt: new Date().toISOString(),
      prompt: request.prompt,
      preferredPlugins: request.preferredPlugins || [],
      memoryContextIds: request.memoryContextIds || {},
      stepCount: plan.steps.length,
    };

    const targets = [
      memory.workflow?.setVariable('planner.plan.metadata', metadata),
      memory.conversation?.setVariable('planner.plan.metadata', metadata),
      memory.session?.setVariable('planner.plan.metadata', metadata),
    ].filter(Boolean) as Promise<void>[];

    await Promise.all(targets);
  }

  private async persistExecutionContext(plan: PlanModel, memory: PlannerMemoryScope): Promise<void> {
    const context = {
      planId: plan.id,
      stepIds: plan.steps.map((step) => step.id),
      pluginIds: Array.from(new Set(plan.steps.map((step) => step.pluginId))),
      toolIds: Array.from(new Set(plan.steps.map((step) => step.toolId))),
      stepCount: plan.steps.length,
    };

    const targets = [
      memory.workflow?.setVariable('planner.execution.context', context),
      memory.conversation?.setVariable('planner.execution.context', context),
      memory.session?.setVariable('planner.execution.context', context),
    ].filter(Boolean) as Promise<void>[];

    await Promise.all(targets);
  }

  private async getConfiguredProvider(): Promise<ILLMProvider | undefined> {
    const provider = this.providerManager.getProvider();
    if (!provider) return undefined;

    try {
      const health = await provider.healthCheck();
      return health.ok ? provider : undefined;
    } catch {
      return undefined;
    }
  }

  private async addLlmReview(plan: PlanModel, request: PlanningRequest): Promise<void> {
    const provider = await this.getConfiguredProvider();
    if (!provider) return;

    const model = this.providerManager.getDefaultModel(provider.name) || 'mistral';
    const prompt = `Review the following workflow plan and provide a concise explanation of its purpose and step selection in 2-3 sentences.\n\nPlan ID: ${plan.id}\nSteps:\n${plan.steps.map((step) => `- ${step.id}: ${step.pluginId}.${step.toolId}`).join('\n')}\n\nExplain the chosen tools and whether the plan matches the user request: ${request.prompt}`;

    try {
      const response = await provider.generate({
        model,
        prompt,
        maxTokens: 150,
        temperature: 0.2
      });
      plan.metadata = {
        ...plan.metadata,
        llmReview: response.text.trim()
      };
    } catch {
      // continue without LLM metadata if provider is unavailable
    }
  }

  async plan(request: PlanningRequest): Promise<PlanResult> {
    const memory = await this.loadMemoryContext(request.memoryContextIds);
    const enrichedRequest = await this.injectMemory(request, memory);

    const id = `plan-${uuidv4()}`;
    const tokens = enrichedRequest.prompt.split(/\s+/).slice(0, 30);
    const keywords = tokens.filter((t) => t.length > 3).slice(0, 5);

    const steps: PlanStep[] = [];
    let stepIdx = 1;
    for (const kw of keywords) {
      const matches = this.resolver.findToolsByKeyword(kw);
      if (matches.length > 0) {
        const m = matches[0];
        const step: PlanStep = { id: `s${stepIdx++}`, pluginId: m.pluginId, toolId: m.toolId, input: { query: kw } };
        steps.push(step);
      }
    }

    if (steps.length === 0) {
      const fallback = this.resolver.findToolsByKeyword('echo')[0];
      if (fallback) steps.push({ id: 's1', pluginId: fallback.pluginId, toolId: fallback.toolId, input: { prompt: enrichedRequest.prompt } });
    }

    const plan: PlanModel = {
      id,
      name: `Plan for: ${enrichedRequest.prompt.slice(0, 40)}`,
      steps,
      metadata: { source: 'memory-aware-simple-rule-planner' },
    };

    const validator = new PlanValidator(this.resolver);
    const valid = validator.validate(plan);
    if (!valid.valid) return { success: false, errors: valid.errors };

    const optimizer = new PlanOptimizer();
    const optimized = optimizer.optimize(plan);

    const wg = new WorkflowGenerator();
    const wf = wg.toWorkflow(optimized);

    const compiler = new WorkflowCompiler();
    const compiled = compiler.compile(wf);

    await this.writePlanMetadata(optimized, enrichedRequest, memory);
    await this.persistExecutionContext(optimized, memory);
    await this.addLlmReview(optimized, enrichedRequest);

    return { success: true, plan: optimized, workflow: compiled, reasoning: 'memory-aware rule-based mapping of keywords to tools' };
  }
}
