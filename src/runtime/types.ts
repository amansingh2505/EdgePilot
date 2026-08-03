// Minimal runtime types
export interface ToolResult {
  success: boolean;
  output: any;
  error?: string;
}

export interface Tool {
  id: string;
  name: string;
  description?: string;
  run(args: any): Promise<ToolResult>;
}

export interface Plugin {
  id: string;
  name: string;
  version: string;
  tools: Tool[];
}

export interface ExecutionRequest {
  toolId: string;
  args: any;
}
