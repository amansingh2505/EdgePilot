# Tool & Plugin Interface (high-level)

This document describes the common tool/plugin interface for EdgePilot.

- Tools must implement a run(args: object) -> { success: boolean, output: any }
- Plugins are bundles that expose one or more tools plus metadata (name, version, author, interface schema)
- Communication between the AI Runtime and tools should be JSON-serializable
- Each tool should declare:
  - id: string
  - name: string
  - description: string
  - input_schema: JSON-schema (optional)
  - run(args) -> ToolResult

The repository contains example TypeScript and Python plugins under plugins/ for reference.
