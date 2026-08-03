# Getting Started with EdgePilot

## Installation

To use EdgePilot, you need Node.js 16+ and TypeScript:

```bash
npm install
npm run build
```

## Configuration

### Environment Variables

- `EDGEPILOT_FS_ROOT`: Base directory for FileSystem plugin (default: current working directory)
- `OLLAMA_URL`: Ollama API endpoint (default: http://localhost:11434)

### Plugin Configuration

Plugins are discovered from the `plugins/` directory. Each plugin must have:
- `plugin.json`: Manifest with plugin metadata and tool definitions
- `index.js`: Module exporting plugin implementation

## Running Your First Workflow

### Step 1: Start Ollama (if using LLM features)

```bash
ollama serve
ollama pull mistral  # Or another model
```

### Step 2: Create a Workflow

Create `workflows/my-workflow.json`:

```json
{
  "id": "my-workflow",
  "name": "My First Workflow",
  "steps": [
    {
      "id": "list-files",
      "pluginId": "org.edgepilot.filesystem",
      "toolId": "fs.list",
      "input": { "path": "." }
    }
  ]
}
```

### Step 3: Execute the Workflow

```bash
npm run start:workflow workflows/my-workflow.json
```

## Debugging

Enable verbose logging by setting `DEBUG=edgepilot:*`:

```bash
DEBUG=edgepilot:* npm run start:workflow workflows/my-workflow.json
```

## Best Practices

1. **Always validate inputs**: Use schema validation before tool execution
2. **Implement retries**: Use retry policies for network-dependent operations
3. **Set timeouts**: Prevent workflows from hanging indefinitely
4. **Use conditions**: Control step execution with contextual conditions
5. **Log extensively**: Track execution for debugging and auditing
6. **Test locally**: Use Ollama for local LLM testing before production deployment
