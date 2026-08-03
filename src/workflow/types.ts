export type Primitive = string | number | boolean | null;

export interface Condition {
  path: string; // dot-path into context
  operator?: '==' | '!=' | '>' | '>=' | '<' | '<=' | 'in' | 'exists';
  value?: any;
}

export interface RetryPolicy {
  attempts: number;
  delayMs?: number;
  backoff?: 'linear' | 'exponential';
}

export interface StepDefinition {
  id: string;
  type?: 'task' | 'parallel';
  pluginId?: string;
  toolId?: string;
  input?: any; // can reference context via ${path}
  condition?: Condition;
  retries?: RetryPolicy;
  timeoutMs?: number;
  steps?: StepDefinition[]; // for parallel
}

export interface WorkflowDefinition {
  id: string;
  name?: string;
  description?: string;
  version?: string;
  timeoutMs?: number;
  steps: StepDefinition[];
}

export type ExecutionStatus = 'pending' | 'running' | 'paused' | 'cancelled' | 'failed' | 'completed';

export interface ExecutionEvent {
  timestamp: string;
  type: string;
  message?: string;
  detail?: any;
}

export interface ExecutionRecord {
  id: string;
  workflowId: string;
  status: ExecutionStatus;
  context: any;
  history: ExecutionEvent[];
}
