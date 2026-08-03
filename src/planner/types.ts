import { WorkflowDefinition } from "../workflow/types";

export interface PlanningRequest {
  userId?: string;
  prompt: string;
  constraints?: { [k: string]: any };
  preferredPlugins?: string[];
}

export interface PlanStep {
  id: string;
  pluginId: string;
  toolId: string;
  input?: any;
  condition?: any;
  retries?: any;
  timeoutMs?: number;
}

export interface PlanModel {
  id: string;
  name?: string;
  description?: string;
  steps: PlanStep[];
  metadata?: { [k: string]: any };
}

export interface PlanResult {
  success: boolean;
  plan?: PlanModel;
  workflow?: WorkflowDefinition; // compiled
  reasoning?: string;
  errors?: string[];
  raw?: any; // raw planner output (LLM or rule engine)
}
