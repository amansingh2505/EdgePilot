import { PlanningRequest, PlanResult } from './types';

export interface IPlanner {
  plan(request: PlanningRequest): Promise<PlanResult>;
}

export type PlannerStrategy = IPlanner;
