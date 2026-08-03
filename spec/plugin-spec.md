# EdgePilot Plugin Specification (Language-agnostic)

This document defines the canonical plugin contract for EdgePilot. It is language-agnostic and must be implemented by any plugin (TypeScript, Python, or other) so the AI Runtime can discover, validate, and invoke plugins reliably.

Key concepts
- Plugin: a package/bundle exposing metadata and one or more Tools.
- Tool: a capability within a plugin that performs a single action (execute).
- Runtime: the host that discovers plugins, validates schemas, manages lifecycle, and calls execute.

Plugin metadata
- id (string, reverse-domain style recommended, e.g., "org.edgepilot.git")
- name (string)
- version (semver string)
- description (string)
- author (string)
- capabilities: array of capability strings (freeform)
- permissions: array of declared permissions the plugin may request (see Permissions section)
- tools: array of ToolDefinitions

ToolDefinition
- id (string) unique within plugin, e.g., "git.commit"
- name (string)
- description (string)
- input_schema (JSON Schema object, optional) — validates execute args
- output_schema (JSON Schema object, optional) — describes expected output
- permissions (array, optional) — permissions required to execute this tool
- examples (array, optional) — sample inputs and expected outputs

Lifecycle hooks (all hooks optional but recommended)
- initialize(context) -> { success, info } | throws
  - Called once when the plugin is registered/enabled. Use to allocate resources.
- execute(args, context) -> ToolResult | throws
  - Called for the tool execution. Must adhere to ToolResult schema.
- shutdown(context) -> { success } | throws
  - Called when plugin is unloaded or runtime is shutting down. Use to free resources.

Capability discovery
- Plugin MUST expose a machine-readable manifest (plugin.json) describing the metadata and tools.
- The runtime will discover installed plugins by scanning configured plugin directories and reading plugin manifests.

Input/Output schemas
- Input and output schemas use JSON Schema (Draft-07 compatible). Runtimes MUST validate inputs against input_schema before run and MAY validate outputs against output_schema after run.

Permissions
- Plugins declare permissions in their manifest (e.g., file:read, file:write, network:outbound, git:modify).
- The runtime enforces permission grants based on user/host policy and may refuse to register or execute tools that require ungranted permissions.

Error handling
- ToolResult MUST include:
  - success: boolean
  - output: any | null
  - error: optional string message
  - code: optional machine-readable error code
  - details: optional object for structured error info
- Exceptions in plugin code should be caught by the runtime and mapped into ToolResult with success=false.

Versioning
- Plugins MUST use semantic versioning for the plugin version string.
- The runtime MAY support minimum/maximum compatible plugin API versions.

Compatibility and language bindings
- TypeScript and Python bindings are provided in this repository to make it easy to author plugins that implement the same contract.
- Language bindings map the same manifest fields and lifecycle hooks.

Security guidance
- Validate inputs against declared JSON schemas.
- Run untrusted plugin code in restricted environments when possible.
- Require explicit permission grants for actions that access the filesystem, network, or execute subprocesses.

Discovery manifest (plugin.json example)
{
  "id": "org.edgepilot.example",
  "name": "Example Plugin",
  "version": "0.1.0",
  "description": "An example plugin exposing an echo tool",
  "author": "EdgePilot",
  "capabilities": ["echo"],
  "permissions": ["none"],
  "tools": [
    {
      "id": "example.echo",
      "name": "Echo",
      "description": "Return the input",
      "input_schema": {"type":"object"},
      "output_schema": {"type":"object"}
    }
  ]
}

See spec/schemas for machine-readable schema files for plugin manifests, tools, and tool results.
