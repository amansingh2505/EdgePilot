"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const exampleTool = {
    id: "example.echo",
    name: "Echo Tool (TS)",
    description: "Returns the provided input",
    async run(args) {
        return { success: true, output: args };
    },
    async execute(args, ctx) {
        // adapter for runtime-engine which expects tool.execute(args, ctx)
        return await exampleTool.run(args);
    }
};
const wrapper = {
    manifest: {
        id: "ts-example",
        name: "TS Example Plugin",
        version: "0.1.0",
        description: "Example plugin for EdgePilot runtime",
        permissions: [],
        tools: [
            {
                id: "example.echo",
                name: "Echo Tool (TS)",
                input_schema: null,
                output_schema: null,
                permissions: []
            }
        ]
    },
    tools: [exampleTool],
    module: {},
    initialize: async () => {},
    shutdown: async () => {}
};
module.exports = wrapper;
