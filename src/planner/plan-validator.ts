import { PlanModel } from './types';
import { ToolCapabilityResolver } from './tool-capability-resolver';

export class PlanValidator {
  constructor(private resolver: ToolCapabilityResolver) {}

  validate(plan: PlanModel): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!plan.steps || plan.steps.length === 0) errors.push('plan has no steps');
    for (const s of plan.steps) {
      if (!s.pluginId || !s.toolId) errors.push(`step ${s.id} missing pluginId/toolId`);
      else if (!this.resolver.toolExists(s.pluginId, s.toolId)) errors.push(`step ${s.id} references unknown tool ${s.pluginId}:${s.toolId}`);
    }
    return { valid: errors.length === 0, errors };
  }
}
