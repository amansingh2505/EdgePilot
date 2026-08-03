# Introduction to EdgePilot

EdgePilot is a distributed AI runtime architecture designed for edge computing environments. It enables intelligent automation by combining modular plugins, workflow orchestration, and local LLM providers.

## Key Features

- **Plugin Architecture**: Extensible system for integrating tools and capabilities
- **Workflow Engine**: Orchestrate multi-step AI-driven processes
- **LLM Integration**: Support for local and remote language models via providers like Ollama
- **File System Access**: Safe, sandboxed filesystem operations through the FileSystem plugin
- **Runtime Isolation**: Security-first design with permission management and validation

## Core Components

1. **Planner**: Converts natural language requests into structured workflow plans
2. **Workflow Engine**: Executes workflow steps with retries, timeouts, and conditions
3. **Runtime**: Manages plugin lifecycle, permissions, and execution context
4. **Plugins**: Modular capabilities like filesystem operations, HTTP requests, etc.
5. **LLM Provider**: Integration layer for language models (Ollama, OpenAI-compatible APIs)

## Use Cases

- Document processing and summarization
- Automated file organization
- Data transformation pipelines
- Intelligent batch processing
- Multi-step task automation
