import { PlanModel, PlanStep } from './types';
import { WorkflowDefinition, StepDefinition } from '../workflow/types';
import { ConsoleLogger } from '../runtime/logger';

export class WorkflowGenerator {
  private logger = new ConsoleLogger();

  toWorkflow(plan: PlanModel): WorkflowDefinition {
    const wf: WorkflowDefinition = { id: plan.id, name: plan.name, description: plan.description, steps: [] };
    for (const s of plan.steps) {
      const step: StepDefinition = {
        id: s.id,
        type: 'task',
        pluginId: s.pluginId,
        toolId: s.toolId,
        input: s.input || {},
        condition: s.condition,
        retries: s.retries,
        timeoutMs: s.timeoutMs,
      };
      wf.steps.push(step);
    }
    this.logger.info(`Converted plan ${plan.id} to workflow with ${wf.steps.length} steps`);
    return wf;
  }
}
