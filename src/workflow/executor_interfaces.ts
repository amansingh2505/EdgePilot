import { ToolResult } from '../runtime/types';
import { ExecutionEvent } from './types';

export interface IToolExecutor {
  execute(pluginId: string, toolId: string, args: any): Promise<ToolResult>;
}

export interface IHistoryStore {
  append(executionId: string, event: ExecutionEvent): Promise<void>;
}
