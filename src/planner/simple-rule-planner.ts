import { IPlanner } from './planner';
import { PlanningRequest, PlanResult, PlanModel, PlanStep } from './types';
import { ToolCapabilityResolver } from './tool-capability-resolver';
import { WorkflowGenerator } from './workflow-generator';
import { PlanValidator } from './plan-validator';
import { PlanOptimizer } from './plan-optimizer';
import { WorkflowCompiler } from './workflow-compiler';
import { v4 as uuidv4 } from 'uuid';

export class SimpleRulePlanner implements IPlanner {
  constructor(private resolver: ToolCapabilityResolver) {}

  async plan(request: PlanningRequest): Promise<PlanResult> {
    const id = `plan-${uuidv4()}`;
    const tokens = request.prompt.split(/\s+/).slice(0, 30);
    const keywords = tokens.filter(t => t.length > 3).slice(0, 5);

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

    // if nothing found, create a fallback echo step (to avoid empty plan)
    if (steps.length === 0) {
      const fallback = this.resolver.findToolsByKeyword('echo')[0];
      if (fallback) steps.push({ id: 's1', pluginId: fallback.pluginId, toolId: fallback.toolId, input: { prompt: request.prompt } });
    }

    const plan: PlanModel = { id, name: `Plan for: ${request.prompt.slice(0, 40)}`, steps };

    const validator = new PlanValidator(this.resolver);
    const valid = validator.validate(plan);
    if (!valid.valid) return { success: false, errors: valid.errors };

    const optimizer = new PlanOptimizer();
    const optimized = optimizer.optimize(plan);

    const wg = new WorkflowGenerator();
    const wf = wg.toWorkflow(optimized);

    const compiler = new WorkflowCompiler();
    const compiled = compiler.compile(wf);

    return { success: true, plan: optimized, workflow: compiled, reasoning: 'rule-based mapping of keywords to tools' };
  }
}
