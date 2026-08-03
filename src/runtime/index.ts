import { Tool, ToolResult } from "./types";

export class AIRuntime {
  private tools: Map<string, Tool> = new Map();

  registerTool(tool: Tool) {
    this.tools.set(tool.id, tool);
  }

  async execute(toolId: string, args: any): Promise<ToolResult> {
    const tool = this.tools.get(toolId);
    if (!tool) return { success: false, output: null, error: `Tool ${toolId} not found` };
    try {
      return await tool.run(args);
    } catch (e: any) {
      return { success: false, output: null, error: e?.message ?? String(e) };
    }
  }
}

// small export for CLI/entry
export default AIRuntime;
