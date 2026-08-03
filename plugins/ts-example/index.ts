// Example TypeScript plugin tool
import { Tool, ToolResult } from "../src/runtime/types";

const exampleTool: Tool = {
  id: "ts.example.echo",
  name: "Echo Tool (TS)",
  description: "Returns the provided input",
  async run(args: any): Promise<ToolResult> {
    return { success: true, output: args };
  }
};

export default exampleTool;
