import { PlanningRequest } from './types';

export class PlanningContext {
  request: PlanningRequest;
  env: { [k: string]: any } = {};

  constructor(request: PlanningRequest, env: { [k: string]: any } = {}) { this.request = request; this.env = env; }
}
