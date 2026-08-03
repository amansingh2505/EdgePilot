// Runtime common types
export type JSONValue = string | number | boolean | null | JSONObject | JSONArray;
export interface JSONObject { [key: string]: JSONValue }
export interface JSONArray extends Array<JSONValue> {}

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

// Plugin manifest and runtime definitions used by the runtime engine
export interface ToolDefinition {
  id: string;
  name?: string;
  input_schema?: any | null;
  output_schema?: any | null;
  permissions?: string[];
}

export interface PluginManifest {
  id: string;
  name?: string;
  version?: string;
  description?: string;
  permissions?: string[];
  tools?: ToolDefinition[];
}

export interface ToolContext {
  pluginId: string;
  toolId: string;
  runtimeVersion?: string;
  [key: string]: any;
}
