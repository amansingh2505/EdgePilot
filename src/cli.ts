#!/usr/bin/env node
import path from 'path';
import { ProviderManager } from './llm/manager';
import { PluginManager, PluginDiscovery, AjvOptionalValidator, ConsoleLogger, RuntimeEngine, PermissionManager } from './runtime';
import { PlannerManager } from './planner/planner-manager';
import { SimpleRulePlanner } from './planner/simple-rule-planner';
import { ToolCapabilityResolver } from './planner/tool-capability-resolver';
import { MemoryManager } from './memory/memory-manager';
import { WorkflowExecutor } from './workflow/executor';
import { WorkflowGenerator } from './planner/workflow-generator';

async function main(): Promise<void> {
  const prompt = process.argv.slice(2).join(' ').trim();
  if (!prompt || prompt === '--help' || prompt === '-h') {
    printUsage();
    process.exit(prompt ? 0 : 1);
    return;
  }

  console.log('🔧 EdgePilot CLI starting...');
  console.log(`📌 Prompt: ${prompt}`);

  const cwd = process.cwd();
  const pluginPath = path.join(cwd, 'plugins');

  const pluginManager = new PluginManager();
  const permissionManager = new PermissionManager();
  const providerManager = new ProviderManager();
  const validator = new AjvOptionalValidator();
  const logger = new ConsoleLogger();

  console.log('📦 Discovering plugins...');
  const discovery = new PluginDiscovery(pluginPath, pluginManager, permissionManager);
  discovery.discover();

  const plugins = pluginManager.listPlugins();
  if (plugins.length === 0) {
    console.warn('⚠️  No plugins discovered in the plugins directory. The planner may not be able to generate a workflow.');
  } else {
    plugins.forEach((plugin) => {
      const permissions = Array.isArray(plugin.permissions) ? plugin.permissions : [];
      if (permissions.length > 0) {
        permissionManager.grant(plugin.id, permissions);
        console.log(`   ✓ Granted permissions for plugin ${plugin.id}: ${permissions.join(', ')}`);
      }
    });
    console.log(`   ✓ ${plugins.length} plugin(s) loaded`);
  }

  console.log('⚙️  Initializing runtime engine...');
  const runtimeEngine = new RuntimeEngine(pluginManager, validator, logger, permissionManager);

  console.log('🧠 Initializing planner...');
  const resolver = new ToolCapabilityResolver(pluginManager);
  const memoryManager = new MemoryManager();
  const simplePlanner = new SimpleRulePlanner(resolver, memoryManager, providerManager);
  const plannerManager = new PlannerManager();
  plannerManager.registerStrategy('default', simplePlanner);
  console.log('   ✓ Planner initialized');

  console.log('🚧 Generating workflow plan...');
  const planResult = await plannerManager.plan({ prompt });

  if (!planResult.success) {
    console.error('❌ Planning failed.');
    if (planResult.errors) console.error('Errors:', JSON.stringify(planResult.errors, null, 2));
    process.exit(1);
    return;
  }

  console.log('   ✓ Plan generated successfully');
  console.log(`   Plan ID: ${planResult.plan?.id}`);
  console.log(`   Steps: ${planResult.plan?.steps.length ?? 0}`);
  if (planResult.reasoning) console.log(`   Reasoning: ${planResult.reasoning}`);

  const workflow = planResult.workflow ?? new WorkflowGenerator().toWorkflow(planResult.plan!);

  console.log('🚀 Executing workflow...');
  const toolExecutor = {
    execute: async (pluginId: string, toolId: string, args: any) => {
      const response = await runtimeEngine.handle({ pluginId, toolId, args });
      if (!response.success) {
        throw new Error(response.error || 'tool execution failed');
      }
      return response.result;
    }
  };

  const executor = new WorkflowExecutor(toolExecutor);
  const executionResult = await executor.execute(workflow, {}, { verbose: true });

  if (!executionResult.success) {
    console.error('❌ Workflow execution failed:', executionResult.error || 'Unknown error');
    process.exit(1);
    return;
  }

  console.log('✅ Workflow executed successfully');
  executor.printSummary();

  console.log('📄 Final result context:');
  console.log(JSON.stringify(executionResult.context, null, 2));
}

function printUsage(): void {
  console.log('Usage: edgepilot "<natural language prompt>"');
  console.log('Or: npm run edgepilot -- "<natural language prompt>"');
}

main().catch((error) => {
  console.error('❌ EdgePilot CLI error:', error?.message || error);
  process.exit(1);
});
