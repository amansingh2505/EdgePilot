import { PlanModel } from './types';
import { ConsoleLogger } from '../runtime/logger';

export class PlanOptimizer {
  private logger = new ConsoleLogger();

  optimize(plan: PlanModel): PlanModel {
    // placeholder optimizer: no-op for now
    this.logger.info(`Optimizing plan ${plan.id} (noop)`);
    return plan;
  }
}
