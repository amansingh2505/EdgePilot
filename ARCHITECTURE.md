EdgePilot — Architecture Overview

Date: 2026-08-03T16:36:49+05:30

This document summarizes the overall architecture present in this repository, the main components and data flows, integration points, and the "elephants" (major design/operational issues) that should be addressed. It was produced by reading the project sources and documentation.

Core Concepts & Layers

- Planner / Orchestration: Converts high-level requests into executable workflow plans (not fully implemented in the codebase but indicated by planner folders and demo docs). See planner sources in [src/planner/](/C:/Users/hp pc/Desktop/EdgePilot.worktrees/edgepilot-ai-runtime-architecture/src/planner).

- Workflow Engine: Orchestrates execution of step-by-step workflows: sequential/parallel steps, condition evaluation, retries, timeouts, and context propagation. Relevant files: [src/workflow/executor.ts](C:/Users/hp pc/Desktop/EdgePilot.worktrees/edgepilot-ai-runtime-architecture/src/workflow/executor.ts), [src/workflow/types.ts](C:/Users/hp pc/Desktop/EdgePilot.worktrees/edgepilot-ai-runtime-architecture/src/workflow/types.ts), [src/workflow/context.ts](C:/Users/hp pc/Desktop/EdgePilot.worktrees/edgepilot-ai-runtime-architecture/src/workflow/context.ts), and step executors in [src/workflow/step-executors/](/C:/Users/hp pc/Desktop/EdgePilot.worktrees/edgepilot-ai-runtime-architecture/src/workflow/step-executors).

- Runtime Engine: Responsible for loading plugins, enforcing permissions, validating inputs/outputs, and invoking plugin tools. See [src/runtime/runtime-engine.ts](C:/Users/hp pc/Desktop/EdgePilot.worktrees/edgepilot-ai-runtime-architecture/src/runtime/runtime-engine.ts), [src/runtime/plugin-manager.ts](C:/Users/hp pc/Desktop/EdgePilot.worktrees/edgepilot-ai-runtime-architecture/src/runtime/plugin-manager.ts), [src/runtime/plugin-discovery.ts](C:/Users/hp pc/Desktop/EdgePilot.worktrees/edgepilot-ai-runtime-architecture/src/runtime/plugin-discovery.ts), and validator/logger in [src/runtime/validator.ts](C:/Users/hp pc/Desktop/EdgePilot.worktrees/edgepilot-ai-runtime-architecture/src/runtime/validator.ts) and [src/runtime/logger.ts](C:/Users/hp pc/Desktop/EdgePilot.worktrees/edgepilot-ai-runtime-architecture/src/runtime/logger.ts).

- Plugin Model: Plugins declare a manifest, tools, permissions and optionally provide code entry points (node or python). Example plugin layout and discovery are under [plugins/](/C:/Users/hp pc/Desktop/EdgePilot.worktrees/edgepilot-ai-runtime-architecture/plugins) and discovery is implemented in [src/runtime/plugin-discovery.ts](C:/Users/hp pc/Desktop/EdgePilot.worktrees/edgepilot-ai-runtime-architecture/src/runtime/plugin-discovery.ts).

- LLM Provider Layer: Abstracts access to language-model backends. The repo includes an Ollama provider implementation in [src/llm/ollama-provider.ts](C:/Users/hp pc/Desktop/EdgePilot.worktrees/edgepilot-ai-runtime-architecture/src/llm/ollama-provider.ts), config loader [src/llm/config.ts](C:/Users/hp pc/Desktop/EdgePilot.worktrees/edgepilot-ai-runtime-architecture/src/llm/config.ts) and retry helper [src/llm/retry.ts](C:/Users/hp pc/Desktop/EdgePilot.worktrees/edgepilot-ai-runtime-architecture/src/llm/retry.ts).

How components interact (high level)

1. Planner receives an intent and produces a WorkflowDefinition (not shown as a single file — planner pieces live in [src/planner/]).
2. WorkflowExecutor ([src/workflow/executor.ts](C:/Users/hp pc/Desktop/EdgePilot.worktrees/edgepilot-ai-runtime-architecture/src/workflow/executor.ts)) walks the workflow steps, using WorkflowContext ([src/workflow/context.ts](C:/Users/hp pc/Desktop/EdgePilot.worktrees/edgepilot-ai-runtime-architecture/src/workflow/context.ts)) for values and interpolation.
3. For each step, a TaskStepExecutor ([src/workflow/step-executors/task-step-executor.ts](C:/Users/hp pc/Desktop/EdgePilot.worktrees/edgepilot-ai-runtime-architecture/src/workflow/step-executors/task-step-executor.ts)) calls into a tool executor (IToolExecutor) which is an adapter over the RuntimeEngine or other execution backends.
4. RuntimeEngine ([src/runtime/runtime-engine.ts](C:/Users/hp pc/Desktop/EdgePilot.worktrees/edgepilot-ai-runtime-architecture/src/runtime/runtime-engine.ts)) looks up the plugin and tool via PluginManager and enforces permissions (PermissionManager), validates input/output with AjvOptionalValidator, and executes the tool.execute(args, ctx).
5. Tools live inside plugins (node modules or language-specific entries). PluginDiscovery ([src/runtime/plugin-discovery.ts](C:/Users/hp pc/Desktop/EdgePilot.worktrees/edgepilot-ai-runtime-architecture/src/runtime/plugin-discovery.ts)) can load plugins from the plugins directory and register them into PluginManager.
6. Some tools may call into LLM providers (e.g., OllamaProvider) for model inference.

Key code shapes and contracts

- Plugin wrapper expected shape (used by PluginManager.register and runtime): a wrapper object with a .manifest and .tools array (see [src/runtime/plugin-manager.ts](C:/Users/hp pc/Desktop/EdgePilot.worktrees/edgepilot-ai-runtime-architecture/src/runtime/plugin-manager.ts)). Each tool should expose an id and an execute(args, ctx) function.

- Tool manifest format: plugin discovery expects plugins to ship a JSON manifest named plugin.json (see discovery: it looks up 'plugin.json' under each plugin directory). The manifest keys: id, name, version, language, entry, permissions, tools[] (see [plugins/py-example/plugin.json](C:/Users/hp pc/Desktop/EdgePilot.worktrees/edgepilot-ai-runtime-architecture/plugins/py-example/plugin.json)).

- Runtime execution path: RuntimeEngine handles validation and permission checks before calling the tool.execute function — result shape is a ToolResult with success/output/error (see [src/runtime/types.ts](C:/C:/Users/hp pc/Desktop/EdgePilot.worktrees/edgepilot-ai-runtime-architecture/src/runtime/types.ts)).

Examples & utilities

- Example runner (prints a single execution) is at [src/examples/run-example.ts](C:/Users/hp pc/Desktop/EdgePilot.worktrees/edgepilot-ai-runtime-architecture/src/examples/run-example.ts) and [dist/examples/run-example.js](C:/Users/hp pc/Desktop/EdgePilot.worktrees/edgepilot-ai-runtime-architecture/dist/examples/run-example.js).

- Example plugins: Python example under [plugins/py-example](C:/Users/hp pc/Desktop/EdgePilot.worktrees/edgepilot-ai-runtime-architecture/plugins/py-example) and a TypeScript example under [plugins/ts-example](C:/Users/hp pc/Desktop/EdgePilot.worktrees/edgepilot-ai-runtime-architecture/plugins/ts-example).

The elephant(s) in the room (major issues discovered)

1) Plugin manifest/name/format inconsistencies

- The discovery expects a manifest file named plugin.json (see [src/runtime/plugin-discovery.ts](C:/Users/hp pc/Desktop/EdgePilot.worktrees/edgepilot-ai-runtime-architecture/src/runtime/plugin-discovery.ts)). All plugins have been standardized to use plugin.json and to export a Node wrapper module at the path declared in plugin.json.entry.

2) Plugin module shape variance

- Plugins were authored in multiple languages (Python, Node). To remove ambiguity, the repository now enforces a single plugin wrapper contract: plugins must export a wrapper module (Node) that contains manifest, tools (array of {id, execute}), and optional initialize()/shutdown() lifecycle functions. For existing Python plugins a small Node wrapper delegates execution to the Python implementation via a CLI adapter.

  Impact: runtime and discovery no longer need heuristics to adapt different plugin shapes; the plugin contract is explicit and enforced at discovery time.

  Recommended fix: continue to keep plugin manifests and wrapper modules in sync; add schema validation and CI to prevent regressions.

3) src vs dist mismatch and build fragility

- The repository has prebuilt JS under dist/ that sometimes differs in expectations from src/ (e.g., dist examples ran after a small plugin fix while building from src initially failed until tsconfig/types were updated). The TypeScript sources referenced Node globals (require, process, fetch) but tsconfig lacked Node types and DOM libs.

  Impact: contributors may be confused when running dist vs building from source; build will fail on developer machines without the right TS config or Node version.

  Recommended fix:
  - Align src exports and types with dist artifacts or regenerate dist from current src and commit both.
  - Add CONTRIBUTING.md with clear build/run environment (Node version required — Node 18+ is recommended because code uses fetch/AbortSignal/TextDecoder) and steps.
  - Add a CI job that runs npm run build and npm start to detect regressions.

4) Node runtime compatibility and fetch/streaming APIs

- The Ollama provider uses global fetch, AbortSignal.timeout and ReadableStream reader APIs. Those require Node 18+ or a fetch polyfill (node-fetch or undici). tsconfig change added DOM lib to satisfy TypeScript, but runtime still needs a compatible Node runtime.

  Impact: On Node 16 or older, runtime will fail at runtime when OllamaProvider tries to call fetch/AbortSignal.timeout, or when it uses streaming response getReader().

  Recommended fix: document Node version (>=18) OR add a small adapter that uses undici (or node-fetch) and a polyfill for AbortSignal.timeout and TextDecoder for older Node versions. Prefer requiring Node 18+ for simplicity.

5) Validation fallback behavior

- Validator attempts to require ajv dynamically; project has ajv in dependencies so this is OK for most installs. But if ajv is removed or missing, validator permits all inputs with a warning. This is tolerable for development but risky in production.

  Recommended fix: Make Ajv presence explicit (add dev/runtime dependency in package.json), or surface a startup warning/error when Ajv is missing in production mode.

6) Permission model is permissive by default

- Discovery auto-grants empty/none permission sets but otherwise does not auto-grant declared permissions. There is no UI or automated flow for granting plugin permissions during dev.

  Recommended fix: Provide a policy file or interactive grant mechanism in the runtime start-up for operators to review and grant permissions; document the process.

Operational notes & run/build guidance (concise)

- Node: run on Node 18+ for built-in fetch and AbortSignal streaming support.
- To run examples (pre-built):
  - Set-Location 'C:\Users\hp pc\Desktop\EdgePilot.worktrees\edgepilot-ai-runtime-architecture'
  - npm start  # runs dist/examples/run-example.js
- To build from source and run:
  - npm install
  - npm run build
  - npm start

Where to look in the code (quick links)

- Runtime core: [src/runtime/runtime-engine.ts](C:/Users/hp pc/Desktop/EdgePilot.worktrees/edgepilot-ai-runtime-architecture/src/runtime/runtime-engine.ts)
- Plugin discovery: [src/runtime/plugin-discovery.ts](C:/Users/hp pc/Desktop/EdgePilot.worktrees/edgepilot-ai-runtime-architecture/src/runtime/plugin-discovery.ts)
- Plugin manager: [src/runtime/plugin-manager.ts](C:/Users/hp pc/Desktop/EdgePilot.worktrees/edgepilot-ai-runtime-architecture/src/runtime/plugin-manager.ts)
- Workflow executor: [src/workflow/executor.ts](C:/Users/hp pc/Desktop/EdgePilot.worktrees/edgepilot-ai-runtime-architecture/src/workflow/executor.ts)
- Workflow step executor: [src/workflow/step-executors/task-step-executor.ts](C:/Users/hp pc/Desktop/EdgePilot.worktrees/edgepilot-ai-runtime-architecture/src/workflow/step-executors/task-step-executor.ts)
- Ollama LLM provider: [src/llm/ollama-provider.ts](C:/Users/hp pc/Desktop/EdgePilot.worktrees/edgepilot-ai-runtime-architecture/src/llm/ollama-provider.ts)
- Example runner: [src/examples/run-example.ts](C:/Users/hp pc/Desktop/EdgePilot.worktrees/edgepilot-ai-runtime-architecture/src/examples/run-example.ts)
- Example plugin (Python): [plugins/py-example/plugin.json](C:/Users/hp pc/Desktop/EdgePilot.worktrees/edgepilot-ai-runtime-architecture/plugins/py-example/plugin.json)
- Example plugin (TS): [plugins/ts-example/index.js](C:/Users/hp pc/Desktop/EdgePilot.worktrees/edgepilot-ai-runtime-architecture/plugins/ts-example/index.js)

Actionable recommendations (prioritized)

1. Standardize plugin manifest filename and schema: choose plugin.json (or update discovery) and update/release sample plugins accordingly. Add a schema under [spec/schemas/plugin.json](C:/Users/hp pc/Desktop/EdgePilot.worktrees/edgepilot-ai-runtime-architecture/spec/schemas/plugin.json) and assert it in CI.

2. Normalize plugin module contract: require plugins to export a wrapper with manifest and tools[] or make discovery normalize single-tool modules into wrapper objects. Update discovery logic to load both shapes and document the contract.

3. Document runtime requirements: add CONTRIBUTING.md and README with Node version (>=18), build steps, and how to run examples. Add a small start script that checks Node version and key dependencies (ajv, undici if needed).

4. Add CI job: run npm ci, npm run build, and run a smoke test (node dist/examples/run-example.js) to catch src/dist drift.

5. Decide on runtime fetch strategy: require Node 18+ or include undici/fetch polyfill. Update package.json and tsconfig accordingly.

6. Improve permission granting workflow: add interactive grant or policy file and document the security model.

7. Add unit/integration tests for the runtime-engine and plugin loading to prevent regressions.

Closing notes

- The codebase uses a layered, extensible design: planner -> workflow -> runtime -> plugin -> provider. That separation is strong and makes targeted improvements straightforward.
- The largest immediate source of friction is mismatch in plugin manifest/exports and Node/TS build/runtime expectations. Address those first (standardize manifests and document Node version), then add CI coverage.

If desired, next actions that can be done now:
- Rename/duplicate plugins/ts-example/manifest.json → plugins/ts-example/plugin.json so discovery finds it automatically.
- Update plugin-discovery to accept both manifest.json and plugin.json.
- Add a small Node version check script and update README/CONTRIBUTING.
- Add a CI workflow file to run build and smoke test.

If you want any of the above performed, choose one and I will apply the changes and commit them.
