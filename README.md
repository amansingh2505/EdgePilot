# EdgePilot

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![License](https://img.shields.io/badge/license-Unlicensed-lightgrey)
![TypeScript](https://img.shields.io/badge/TypeScript-4.9-blue)
![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18.0-green)

## AI Runtime for Local and Edge AI Agents

EdgePilot is an AI runtime designed to orchestrate agent-style workflows locally and on edge devices. It connects planner, workflow, runtime, plugin, memory, and LLM provider components to support lightweight AI automation without cloud dependence.

## Overview

EdgePilot provides a modular runtime for building AI agents in TypeScript and JavaScript. It maintains a clear separation between planning, execution, memory, and provider integration so teams can compose local workflows and plugins while using provider-agnostic LLM support.

## Why EdgePilot?

- Designed for **local and edge execution** with lightweight runtime behavior.
- Supports **provider-agnostic LLM integration**, currently wired to **Ollama**.
- Includes an **extensible plugin system** for local tools such as filesystem operations.
- Built to keep planning, memory, and execution loosely coupled for easier iteration and reuse.

## Key Features

- Planner-driven workflow generation
- Lightweight runtime engine for tool execution
- Plugin manifest and execution model
- Memory/context management across session, conversation, and workflow scopes
- Ollama LLM integration with health checks and streaming support
- Example end-to-end demo for local markdown summarization

## Architecture Overview

```mermaid
flowchart TB
  User["User Request"] --> Planner["Planner"]
  Planner --> Memory["Memory / Context"]
  Planner --> Workflow["Workflow Engine"]
  Workflow --> Runtime["Runtime Engine"]
  Runtime --> Plugins["Plugins"]
  Plugins --> LLM["LLM Provider"]
  Runtime --> Memory
  note right of LLM: Currently supports Ollama
```

## Project Structure

- `src/` – core runtime, planner, workflow, memory, and LLM code
- `plugins/` – example plugins for filesystem and TypeScript tools
- `workflows/` – sample workflow definitions
- `demo-test-data/` – sample markdown files for demo execution
- `spec/` – schema and tool interface documentation
- `README.md` – project documentation
- `package.json` – scripts and dependencies

## Installation

```bash
git clone <repo-url>
cd edgepilot-ai-runtime-architecture
npm install
npm run build
```

## Prerequisites

- Node.js 18 or newer
- npm
- Optional: local Ollama runtime for LLM inference

## Configuration

EdgePilot reads LLM provider configuration from `llm-config.json` or environment variables.

Example `llm-config.json`:

```json
{
  "defaultProvider": "ollama",
  "defaultModel": "mistral",
  "providers": [
    {
      "name": "ollama",
      "type": "ollama",
      "enabled": true,
      "options": {
        "baseUrl": "http://localhost:11434",
        "model": "mistral",
        "timeoutMs": 30000
      }
    }
  ]
}
```

Environment variables:

- `OLLAMA_URL` – Ollama server URL
- `OLLAMA_MODEL` – default model name
- `LLM_DEFAULT_PROVIDER` – default provider name

## Quick Start

Run the end-to-end demo after building:

```bash
npm run start:e2e-demo
```

This demo demonstrates a planner generating a workflow, runtime executing plugin tasks, and writing a generated summary report.

## Example Workflow

The sample workflow ties together planning and filesystem tasks. A workflow definition typically includes:

- Input parameters
- Task steps
- Plugin tool calls
- Execution context

Example flow:

1. Natural language request enters the planner.
2. Planner converts request into a workflow plan.
3. Workflow engine executes tasks through the runtime.
4. Runtime invokes plugin tools.
5. Plugin output is collected and optionally summarized.

## Supported Plugins

- `plugins/filesystem/` – local filesystem discovery and read/write tools
- `plugins/ts-example/` – example TypeScript plugin wrapper demonstrating runtime registration

## LLM Providers

EdgePilot is provider-agnostic and currently supports **Ollama**.

- Uses the existing provider framework via `ProviderManager`
- 
- Supports health checks and streaming inference
- Optimized for lightweight local models on edge devices

## Memory & Context

The memory subsystem provides scoped persistent data for:

- `session`
- `conversation`
- `workflow`
- `global`

Planner and workflows can inject memory variables into request contexts and store metadata back into memory after execution.

## Workflow Engine

The workflow engine executes structured workflow definitions via:

- `WorkflowExecutor`
- `TaskStepExecutor`
- tool execution through runtime adapters

It maintains execution history and step results for diagnostics.

## Security Model

EdgePilot enforces a simple runtime security model:

- Plugin permissions are granted explicitly at startup
- Runtime input is validated before execution
- Plugins execute only the tools they expose

## Roadmap

- Improve provider abstractions and local model support
- Add dashboard / observability interfaces
- Expand plugin and tool ecosystem
- Nail down a `v1.0` runtime release

## Contributing

Contributions are welcome. Please follow standard open-source practices:

1. Fork the repository
2. Create a feature branch
3. Submit a pull request with a clear description

## License

This repository currently does not include a LICENSE file. Please add a license if you intend to publish the project publicly.

## Acknowledgements

EdgePilot is inspired by edge-first AI runtimes and local agent orchestration patterns. Thanks to the open-source community for tooling and runtime design guidance.
