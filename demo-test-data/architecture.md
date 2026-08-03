# EdgePilot Architecture Overview

## System Design

EdgePilot follows a layered architecture pattern with clear separation of concerns:

### Layer 1: User Interface
The user interacts with EdgePilot through natural language requests or programmatic APIs. Requests flow through the Planner component.

### Layer 2: Planner
The Planner analyzes requests and generates structured workflow plans. It uses rule-based matching or LLM-powered analysis to determine which tools and plugins are needed.

### Layer 3: Workflow Engine
The Workflow Engine executes plans as workflows. It handles:
- Sequential and parallel step execution
- Condition evaluation and branching
- Retry logic with exponential backoff
- Timeout handling
- Context management across steps

### Layer 4: Runtime Engine
The Runtime manages plugin execution, enforces permissions, and validates inputs/outputs:
- Plugin discovery and lifecycle management
- Permission checks before tool execution
- Input/output schema validation using AJV
- Execution context provision

### Layer 5: Plugins
Plugins are modules that expose tools for specific domains:
- FileSystem Plugin: Directory listing, file I/O, search
- Custom Plugins: Domain-specific tools (HTTP, databases, APIs)
- Plugin Interface: Standard tool definition format with schemas

### Layer 6: LLM Provider
Language models power intelligent operations:
- Ollama Provider: Local model execution
- Provider Registry: Support for multiple LLM backends
- Streaming Support: Real-time token streaming for long operations

## Data Flow

```
Natural Language Request
    ↓
Planner (generates PlanModel)
    ↓
Workflow Generator (converts to WorkflowDefinition)
    ↓
Workflow Executor (orchestrates execution)
    ↓
Runtime Engine (validates & executes tool)
    ↓
Plugin (executes tool, returns result)
    ↓
LLM Provider (processes, analyzes, transforms)
    ↓
Final Result
```

## Security Features

- **Permission Management**: Tools can declare required permissions; Runtime enforces them
- **Path Sanitization**: FileSystem plugin prevents directory traversal attacks
- **Schema Validation**: All inputs validated against tool schemas before execution
- **Execution Isolation**: Each tool execution is isolated with its own context
