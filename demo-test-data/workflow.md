# Workflow Definition and Execution

## Workflow Structure

A workflow is a collection of steps that execute in sequence (or in parallel for specific step groups). Each step represents a tool invocation from a plugin.

### Step Definition

```json
{
  "id": "step-1",
  "type": "task",
  "pluginId": "org.edgepilot.filesystem",
  "toolId": "fs.search",
  "input": {
    "pattern": "*.md",
    "path": "./docs"
  },
  "condition": {
    "path": "context.ready",
    "operator": "==",
    "value": true
  },
  "retries": {
    "attempts": 3,
    "delayMs": 100,
    "backoff": "exponential"
  },
  "timeoutMs": 5000
}
```

## Execution Flow

1. **Step Start**: Log execution start with timestamp
2. **Condition Check**: Evaluate step condition against context
3. **Input Preparation**: Interpolate context variables into input
4. **Tool Execution**: Call plugin tool with prepared input
5. **Result Processing**: Store result in context for next steps
6. **History Recording**: Append execution event to history
7. **Error Handling**: Apply retry logic if tool fails
8. **Timeout Handling**: Enforce timeout limits per step

## Context Management

The workflow context is a global store that persists across all steps:

```typescript
context.set('files', [...]); // Store discovered files
context.get('files'); // Retrieve in next step
context.interpolate('${files.0.name}'); // Use in inputs
```

## Parallel Execution

For performance-critical operations, steps can execute in parallel:

```json
{
  "id": "parallel-reads",
  "type": "parallel",
  "steps": [
    { "id": "read-file-1", ... },
    { "id": "read-file-2", ... },
    { "id": "read-file-3", ... }
  ]
}
```

Results from parallel steps are merged into context.
