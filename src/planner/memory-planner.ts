import { IPlanner } from './planner';
import { PlanningRequest, PlanResult, PlanModel, PlanStep } from './types';
import { ToolCapabilityResolver } from './tool-capability-resolver';
import { WorkflowGenerator } from './workflow-generator';
import { PlanValidator } from './plan-validator';
import { PlanOptimizer } from './plan-optimizer';
import { WorkflowCompiler } from './workflow-compiler';
import { v4 as uuidv4 } from 'uuid';
import { MemoryManager } from '../memory/memory-manager';
import { MemoryContextIds, VariableStore } from '../memory/types';

interface PlannerMemoryScope {
  session?: VariableStore;
  conversation?: VariableStore;
  workflow?: VariableStore;
}

export class MemoryAwarePlanner implements IPlanner {
  constructor(
    private resolver: ToolCapabilityResolver,
    private memoryManager: MemoryManager
  ) {}

  private async loadMemoryContext(ids?: MemoryContextIds): Promise<PlannerMemoryScope> {
    if (!ids) return {};

    const context: PlannerMemoryScope = {};
    if (ids.session) context.session = this.memoryManager.session(ids.session);
    if (ids.conversation) context.conversation = this.memoryManager.conversation(ids.conversation);
    if (ids.workflow) context.workflow = this.memoryManager.workflow(ids.workflow);
    return context;
  }

  private async injectMemoryIntoRequest(request: PlanningRequest, memory: PlannerMemoryScope): Promise<PlanningRequest> {
    const injectedPrompt = await this.interpolatePrompt(request.prompt, memory);
    const injectedConstraints = request.constraints ? await this.interpolateObject(request.constraints, memory) : undefined;

    return {
      ...request,
      prompt: injectedPrompt,
      constraints: injectedConstraints,
    };
  }

  private async interpolatePrompt(prompt: string, memory: PlannerMemoryScope): Promise<string> {
    const placeholderRegex = /\$\{([^}]+)\}/g;
    let result = '';
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = placeholderRegex.exec(prompt)) !== null) {
      result += prompt.slice(lastIndex, match.index);
      const key = match[1].trim();
      const value = await this.lookupMemoryValue(key, memory);
      result += value === undefined || value === null ? '' : String(value);
      lastIndex = placeholderRegex.lastIndex;
    }

    result += prompt.slice(lastIndex);
    return result;
  }

  private async interpolateObject(obj: any, memory: PlannerMemoryScope): Promise<any> {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'string') return await this.interpolatePrompt(obj, memory);
    if (Array.isArray(obj)) return await Promise.all(obj.map(item => this.interpolateObject(item, memory)));
    if (typeof obj === 'object') {
      const result: any = {};
      for (const key of Object.keys(obj)) {
        result[key] = await this.interpolateObject(obj[key], memory);
      }
      return result;
    }
    return obj;
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

  private async writePlanMetadata(plan: PlanModel, memory: PlannerMemoryScope, request: PlanningRequest): Promise<void> {
    const metadata = {
      planId: plan.id,
      planName: plan.name,
      generatedAt: new Date().toISOString(),
      prompt: request.prompt,
      preferredPlugins: request.preferredPlugins || [],
      stepCount: plan.steps.length,
      memoryContextIds: request.memoryContextIds || {},
    };

    await Promise.all([
      memory.workflow?.setVariable('planner.plan.metadata', metadata),
      memory.conversation?.setVariable('planner.plan.metadata', metadata),
      memory.session?.setVariable('planner.plan.metadata', metadata),
    ].filter(Boolean) as Promise<void>[]);
  }

  private async persistExecutionContext(plan: PlanModel, memory: PlannerMemoryScope): Promise<void> {
    const contextValues = {
      planId: plan.id,
      stepIds: plan.steps.map((step) => step.id),
      pluginIds: Array.from(new Set(plan.steps.map((step) => step.pluginId))),
      toolIds: Array.from(new Set(plan.steps.map((step) => step.toolId))),
      stepCount: plan.steps.length,
    };

    await Promise.all([
      memory.workflow?.setVariable('planner.execution.context', contextValues),
      memory.conversation?.setVariable('planner.execution.context', contextValues),
      memory.session?.setVariable('planner.execution.context', contextValues),
    ].filter(Boolean) as Promise<void>[]);
  }

  async plan(request: PlanningRequest): Promise<PlanResult> {
    const memory = await this.loadMemoryContext(request.memoryContextIds);
    const enrichedRequest = await this.injectMemoryIntoRequest(request, memory);

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

    const plan: PlanModel = { id, name: `Plan for: ${enrichedRequest.prompt.slice(0, 40)}`, steps, metadata: { source: 'memory-aware-planner' } };

    const validator = new PlanValidator(this.resolver);
    const valid = validator.validate(plan);
    if (!valid.valid) return { success: false, errors: valid.errors };

    const optimizer = new PlanOptimizer();
    const optimized = optimizer.optimize(plan);

    const wg = new WorkflowGenerator();
    const wf = wg.toWorkflow(optimized);

    const compiler = new WorkflowCompiler();
    const compiled = compiler.compile(wf);

    await this.writePlanMetadata(optimized, memory, enrichedRequest);
    await this.persistExecutionContext(optimized, memory);

    return { success: true, plan: optimized, workflow: compiled, reasoning: 'memory-aware rule-based mapping of keywords to tools' };
  }
}
