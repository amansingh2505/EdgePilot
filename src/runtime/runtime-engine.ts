import { PluginManager } from "./plugin-manager";
import { Validator, ValidationResult } from "./validator";
import { Logger } from "./logger";
import { ToolResult, ToolContext, PluginManifest, ToolDefinition } from "./types";

export interface ExecutionRequest {
  pluginId: string;
  toolId: string;
  args?: any;
}

export interface ExecutionResponse {
  success: boolean;
  result?: ToolResult | null;
  validation?: {
    input?: ValidationResult;
    output?: ValidationResult;
  };
  error?: string;
}

export class RuntimeEngine {
  constructor(
    private plugins: PluginManager,
    private validator: Validator,
    private logger: Logger,
    private runtimeVersion = '0.1.0'
  ) {}

  async handle(request: ExecutionRequest): Promise<ExecutionResponse> {
    const { pluginId, toolId, args } = request;
    try {
      const plugin = this.plugins.getPlugin(pluginId);
      if (!plugin) return { success: false, error: `Plugin ${pluginId} not found` };
      const def = plugin.manifest.tools.find(t => t.id === toolId) as ToolDefinition | undefined;
      if (!def) return { success: false, error: `Tool ${toolId} not found in plugin ${pluginId}` };

      // validate input
      const inputValidation = this.validator.validate(def.input_schema, args);
      if (!inputValidation.valid) {
        return { success: false, validation: { input: inputValidation }, error: 'input_validation_failed' };
      }

      const ctx: ToolContext = { pluginId, toolId, runtimeVersion: this.runtimeVersion };

      // execute
      const tool = this.plugins.getTool(pluginId, toolId);
      if (!tool || typeof tool.execute !== 'function') {
        return { success: false, error: 'tool_execute_not_callable' };
      }

      // call plugin-level initialize for first time if present
      try {
        if (typeof plugin.initialize === 'function') await plugin.initialize(ctx as any);
      } catch (e) {
        this.logger.warn('plugin initialize failed', e);
      }

      let res: ToolResult;
      try {
        res = await tool.execute(args, ctx);
      } catch (e: any) {
        this.logger.error('tool execution threw', e);
        return { success: false, error: e?.message ?? String(e) };
      }

      // validate output
      const outputValidation = this.validator.validate(def.output_schema, res?.output);

      return { success: true, result: res, validation: { input: inputValidation, output: outputValidation } };
    } catch (e: any) {
      this.logger.error('runtime handle error', e);
      return { success: false, error: e?.message ?? String(e) };
    }
  }
}
