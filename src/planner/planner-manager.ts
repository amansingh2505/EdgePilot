import { IPlanner } from './planner';
import { PlanningRequest, PlanResult } from './types';
import { ConsoleLogger } from '../runtime/logger';

export class PlannerManager {
  private strategies: Map<string, IPlanner> = new Map();
  private logger = new ConsoleLogger();

  registerStrategy(name: string, planner: IPlanner) {
    if (this.strategies.has(name)) throw new Error(`Strategy ${name} already registered`);
    this.strategies.set(name, planner);
    this.logger.info(`Registered planner strategy ${name}`);
  }

  async planWith(name: string, req: PlanningRequest): Promise<PlanResult> {
    const strat = this.strategies.get(name);
    if (!strat) throw new Error(`Strategy ${name} not found`);
    return strat.plan(req);
  }

  // pick a default strategy (first registered)
  async plan(req: PlanningRequest): Promise<PlanResult> {
    const first = this.strategies.values().next();
    if (first.done) throw new Error('No planner strategies registered');
    return first.value.plan(req);
  }
}
