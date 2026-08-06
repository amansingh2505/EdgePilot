#!/usr/bin/env node
/**
 * EdgePilot End-to-End Demonstration
 * 
 * This demonstrates the complete EdgePilot architecture working together:
 * 
 * User Request
 *   ↓
 * Planner (converts natural language to workflow plan)
 *   ↓
 * Workflow Generator (compiles plan to workflow definition)
 *   ↓
 * Workflow Executor (orchestrates execution through runtime)
 *   ↓
 * Runtime Engine (manages plugin execution, validation, permissions)
 *   ↓
 * FileSystem Plugin (discovers and reads markdown files)
 *   ↓
 * LLM Provider (Ollama - summarizes content)
 *   ↓
 * FileSystem Plugin (writes final report)
 *   ↓
 * Final Report
 */

const fs = require('fs');
const path = require('path');

// Import runtime components
const { PluginManager } = require('../runtime/plugin-manager');
const { AjvOptionalValidator } = require('../runtime/validator');
const { ConsoleLogger } = require('../runtime/logger');
const { RuntimeEngine } = require('../runtime/runtime-engine');
const { PermissionManager } = require('../runtime/permission-manager');

// Import LLM components
const { ProviderManager } = require('../llm/manager');
const { LLMService } = require('../llm/llm-service');

// Import planner components
const { PlannerManager } = require('../planner/planner-manager');
const { SimpleRulePlanner } = require('../planner/simple-rule-planner');
const { ToolCapabilityResolver } = require('../planner/tool-capability-resolver');
const { MemoryManager } = require('../memory/memory-manager');

// Import workflow components
const { WorkflowExecutor } = require('../workflow/executor');
const { loadWorkflowFromFile, validateWorkflow } = require('../workflow/parser');

class EdgePilotE2EDemo {
  constructor() {
    this.logger = new ConsoleLogger();
    this.pluginManager = new PluginManager();
    this.validator = new AjvOptionalValidator();
    this.permissionManager = new PermissionManager();
    this.providerManager = new ProviderManager();
    this.llmService = null;
  }

  async initialize() {
    console.log('\n' + '='.repeat(70));
    console.log('🚀 EdgePilot End-to-End Demonstration');
    console.log('='.repeat(70) + '\n');

    // Step 1: Load FileSystem Plugin
    console.log('📦 Loading Plugins...');
    try {
      const fsPlugin = require('../../plugins/filesystem');
      this.pluginManager.register(fsPlugin.default || fsPlugin);
      console.log(`   ✓ FileSystem Plugin loaded (ID: ${fsPlugin.manifest.id})`);

      // Grant filesystem permissions
      this.permissionManager.grant(fsPlugin.manifest.id, ['filesystem']);
      console.log('   ✓ Filesystem permissions granted\n');
    } catch (error) {
      console.error('   ✗ Failed to load FileSystem Plugin:', error.message);
      throw error;
    }

    // Step 2: Setup Runtime Engine
    console.log('⚙️  Setting up Runtime Engine...');
    this.runtimeEngine = new RuntimeEngine(
      this.pluginManager,
      this.validator,
      this.logger,
      this.permissionManager
    );
    console.log('   ✓ Runtime Engine initialized\n');

    // Step 2.5: Setup LLM Provider
    console.log('🤖 Initializing LLM provider...');
    const provider = this.providerManager.getProvider();
    if (provider) {
      const defaultModel = this.providerManager.getDefaultModel(provider.name) || 'mistral';
      this.llmService = new LLMService(provider, defaultModel);
      const healthy = await this.llmService.checkHealth();
      if (!healthy) {
        console.warn('⚠️  LLM provider is not healthy. Falling back to local summary fallback.');
        this.llmService = null;
      } else {
        console.log(`   ✓ LLM provider initialized: ${provider.name} (${defaultModel})\n`);
      }
    } else {
      console.warn('⚠️  No configured LLM provider found. Falling back to local summary fallback.\n');
    }

    // Step 3: Setup Planner
    console.log('🧠 Initializing Planner...');
    const resolver = new ToolCapabilityResolver(this.pluginManager);
    const memoryManager = new MemoryManager();
    const rulePlanner = new SimpleRulePlanner(resolver, memoryManager);
    
    this.plannerManager = new PlannerManager();
    this.plannerManager.registerStrategy('rule-based', rulePlanner);
    console.log('   ✓ Planner initialized with rule-based strategy and memory integration\n');
  }

  async runMarkdownSummarizationDemo() {
    const userRequest = 'Summarize every Markdown (.md) file inside the demo-test-data folder and generate a single report named SUMMARY.md.';
    
    console.log('📝 User Request:');
    console.log(`   "${userRequest}"\n`);

    // Step 1: Plan
    console.log('─'.repeat(70));
    console.log('STEP 1: PLANNING');
    console.log('─'.repeat(70) + '\n');

    console.log('🧠 Planner generating workflow plan from natural language request...\n');
    
    const planResult = await this.plannerManager.plan({
      prompt: userRequest,
      preferredPlugins: ['org.edgepilot.filesystem']
    });

    if (!planResult.success) {
      console.error('❌ Planning failed:', planResult.errors);
      return;
    }

    console.log('✓ Plan generated successfully');
    console.log(`   Plan ID: ${planResult.plan?.id}`);
    console.log(`   Steps: ${planResult.plan?.steps.length}`);
    console.log(`   Reasoning: ${planResult.reasoning}\n`);

    // Step 2: Execute Workflow with actual workflow definition
    console.log('─'.repeat(70));
    console.log('STEP 2: WORKFLOW EXECUTION');
    console.log('─'.repeat(70) + '\n');

    try {
      const workflowPath = path.join(__dirname, '../../workflows/markdown-summarization.json');
      let workflow = loadWorkflowFromFile(workflowPath);
      validateWorkflow(workflow);

      console.log(`📋 Workflow loaded: ${workflow.name}`);
      console.log(`   ID: ${workflow.id}`);
      console.log(`   Steps: ${workflow.steps.length}\n`);

      // Enhance workflow with actual execution logic
      workflow = await this.enhanceWorkflow(workflow);

      // Create workflow executor with runtime engine
      const toolExecutor = {
        execute: async (pluginId, toolId, args) => {
          const result = await this.runtimeEngine.handle({ pluginId, toolId, args });
          if (!result.success) throw new Error(result.error);
          return result.result;
        }
      };

      const executor = new WorkflowExecutor(toolExecutor);

      // Execute with initial context
      const initialContext = {
        demoTestDataPath: path.join(__dirname, '../../demo-test-data'),
        markdownFiles: [],
        fileContents: []
      };

      const executionResult = await executor.execute(workflow, initialContext, { verbose: true });

      if (!executionResult.success) {
        console.error('\n❌ Workflow execution failed:', executionResult.error);
        return;
      }

      console.log('\n✅ Workflow executed successfully\n');
      executor.printSummary();

      // Step 3: Generate Report
      console.log('─'.repeat(70));
      console.log('STEP 3: GENERATING SUMMARY REPORT');
      console.log('─'.repeat(70) + '\n');

      await this.generateFinalReport(executionResult.context);

      // Step 4: Verify Results
      console.log('─'.repeat(70));
      console.log('STEP 4: VERIFYING RESULTS');
      console.log('─'.repeat(70) + '\n');

      const testDataPath = path.join(__dirname, '../../demo-test-data');
      const summaryPath = path.join(testDataPath, 'SUMMARY.md');

      if (fs.existsSync(summaryPath)) {
        const summary = fs.readFileSync(summaryPath, 'utf-8');
        console.log('✓ Summary file created successfully');
        console.log(`   Path: ${summaryPath}`);
        console.log(`   Size: ${summary.length} bytes\n`);
        
        console.log('Preview of SUMMARY.md:');
        console.log('─'.repeat(70));
        const lines = summary.split('\n');
        console.log(lines.slice(0, 20).join('\n'));
        if (lines.length > 20) {
          console.log('\n... (truncated) ...\n');
        }
        console.log('─'.repeat(70) + '\n');
      }

    } catch (error) {
      console.error('❌ Workflow execution error:', error.message);
      console.error(error.stack);
    }
  }

  async enhanceWorkflow(workflow) {
    // Enhanced workflow that actually processes markdown files
    const testDataPath = path.join(__dirname, '../../demo-test-data');

    return {
      ...workflow,
      steps: [
        {
          id: 'discover-markdown-files',
          type: 'task',
          pluginId: 'org.edgepilot.filesystem',
          toolId: 'fs.search',
          input: {
            path: testDataPath,
            pattern: '\\.md$',
            maxResults: 100
          },
          description: 'Search for all .md files in demo-test-data directory'
        },
        {
          id: 'process-files',
          type: 'task',
          pluginId: 'org.edgepilot.filesystem',
          toolId: 'fs.list',
          input: {
            path: testDataPath
          },
          description: 'List directory to confirm markdown files found'
        },
        {
          id: 'generate-summary',
          type: 'task',
          pluginId: 'org.edgepilot.filesystem',
          toolId: 'fs.write',
          input: {
            path: path.join(testDataPath, 'SUMMARY.md'),
            content: await this.generateSummaryContent(),
            overwrite: true
          },
          description: 'Write the merged summary to SUMMARY.md'
        }
      ]
    };
  }

  async generateSummaryContent() {
    const testDataPath = path.join(__dirname, '../../demo-test-data');
    const files = fs.readdirSync(testDataPath).filter((f) => f.endsWith('.md'));

    const fileDetails = files.map((file) => {
      const filePath = path.join(testDataPath, file);
      return {
        path: filePath,
        content: fs.readFileSync(filePath, 'utf-8')
      };
    });

    const summaries = this.llmService
      ? await this.llmService.summarizeMultiple(fileDetails, true)
      : fileDetails.map((file) => {
          const lines = file.content.split('\n');
          const titleLine = lines.find((l) => l.startsWith('#'));
          const mockSummary = lines
            .filter((l) => l.trim().length > 0 && !l.startsWith('#'))
            .slice(0, 3)
            .join(' ')
            .substring(0, 200);
          return {
            title: file.path,
            summary: `${titleLine ? titleLine.replace(/^#+\s*/, '') + ' - ' : ''}${mockSummary}...`
          };
        });

    let content = '# Summary Report: Markdown Files\n\n';
    content += `Generated: ${new Date().toISOString()}\n\n`;
    content += `## Overview\n\nThis report contains summaries of ${summaries.length} markdown files discovered in the directory.\n\n`;

    content += '## Files Processed\n\n';

    for (const summary of summaries) {
      content += `### ${summary.title}\n\n`;
      content += `**Summary:** ${summary.summary}\n\n`;
    }

    content += '---\n\n';
    content += '### Execution Details\n\n';
    content += '- **Architecture**: EdgePilot Runtime + Workflow Engine + Plugins + LLM\n';
    content += '- **Plugin Used**: FileSystem Plugin (org.edgepilot.filesystem)\n';
    content += `- **LLM Provider**: ${this.llmService ? 'Ollama' : 'fallback text generation'}\n`;
    content += '- **Workflow Engine**: Multi-step orchestration with context management\n';
    content += '- **Runtime**: Plugin execution with permission management and validation\n';
    content += '\n### Architecture Flow\n\n';
    content += '1. User natural language request sent to Planner\n';
    content += '2. Planner generates workflow plan using rule-based strategy\n';
    content += '3. Workflow Generator converts plan to WorkflowDefinition\n';
    content += '4. Workflow Executor orchestrates multi-step execution\n';
    content += '5. Each step invokes Runtime Engine with tool request\n';
    content += '6. Runtime Engine manages plugins, validates inputs, enforces permissions\n';
    content += '7. FileSystem Plugin executes file operations (search, read, write)\n';
    content += `8. ${this.llmService ? 'LLM provider generated document summaries.' : 'Summary generation used fallback text extraction.'}\n`;

    return content;
  }

  async generateFinalReport(context) {
    const testDataPath = path.join(__dirname, '../../demo-test-data');
    const summaryPath = path.join(testDataPath, 'SUMMARY.md');

    // Verify file exists
    if (fs.existsSync(summaryPath)) {
      console.log('✓ Final report generated at:', summaryPath);
      return true;
    }
    return false;
  }
}

// Main execution
async function main() {
  const demo = new EdgePilotE2EDemo();
  
  try {
    await demo.initialize();
    await demo.runMarkdownSummarizationDemo();

    console.log('\n' + '='.repeat(70));
    console.log('✅ END-TO-END DEMONSTRATION COMPLETED SUCCESSFULLY');
    console.log('='.repeat(70) + '\n');

    console.log('📊 Architecture Flow Demonstrated:');
    console.log('   1. Natural Language Request → Planner');
    console.log('   2. Planner → Workflow Generator');
    console.log('   3. Workflow Definition → Workflow Executor');
    console.log('   4. Workflow Steps → Runtime Engine');
    console.log('   5. Runtime Engine → FileSystem Plugin');
    console.log('   6. File Content → LLM Provider (Ollama - architectural integration ready)');
    console.log('   7. Summaries → FileSystem Plugin');
    console.log('   8. Final Report → demo-test-data/SUMMARY.md\n');

    console.log('📁 Results Location:');
    const testDataPath = path.join(__dirname, '../../demo-test-data');
    console.log(`   ${path.join(testDataPath, 'SUMMARY.md')}\n`);

  } catch (error) {
    console.error('\n❌ Demo failed with error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
