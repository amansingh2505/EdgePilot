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
const manifest = require('./plugin.json');
const wrapper = {
    manifest,
    tools: [exampleTool],
    module: {},
    initialize: async () => {},
    shutdown: async () => {}
};
module.exports = wrapper;
