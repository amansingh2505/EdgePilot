"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const exampleTool = {
    id: "ts.example.echo",
    name: "Echo Tool (TS)",
    description: "Returns the provided input",
    async run(args) {
        return { success: true, output: args };
    }
};
exports.default = exampleTool;
