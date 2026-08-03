import { WorkflowDefinition, StepDefinition, ExecutionEvent } from './types';
import { WorkflowContext } from './context';
import { TaskStepExecutor } from './step-executors/task-step-executor';
import { IToolExecutor } from './executor_interfaces';
import { ConsoleLogger } from '../runtime/logger';
import { v4 as uuidv4 } from 'uuid';

export interface ExecutionOptions {
  verbose?: boolean;
  dryRun?: boolean;
}

export class WorkflowExecutor {
  private logger = new ConsoleLogger();
  private history: ExecutionEvent[] = [];

  constructor(private toolExecutor: IToolExecutor) {}

  async execute(workflow: WorkflowDefinition, initialContext: any = {}, options: ExecutionOptions = {}): Promise<{ success: boolean; context: any; history: ExecutionEvent[]; error?: string }> {
    const executionId = uuidv4();
    const ctx = new WorkflowContext(initialContext);

    this.logger.info(`🚀 Workflow Execution Started`, {
      executionId,
      workflowId: workflow.id,
      workflowName: workflow.name,
      stepCount: workflow.steps.length
    });

    this.history = [];
    this.appendHistory({
      timestamp: new Date().toISOString(),
      type: 'workflow.start',
      message: `Workflow "${workflow.name}" started`
    });

    try {
      await this.executeSteps(workflow.steps, ctx, options);

      this.logger.info(`✅ Workflow Execution Completed`, {
        executionId,
        workflowId: workflow.id
      });

      this.appendHistory({
        timestamp: new Date().toISOString(),
        type: 'workflow.complete',
        message: `Workflow "${workflow.name}" completed successfully`
      });

      return {
        success: true,
        context: ctx.toObject(),
        history: this.history
      };
    } catch (error: any) {
      this.logger.error(`❌ Workflow Execution Failed`, {
        executionId,
        workflowId: workflow.id,
        error: error.message
      });

      this.appendHistory({
        timestamp: new Date().toISOString(),
        type: 'workflow.failed',
        message: `Workflow "${workflow.name}" failed: ${error.message}`,
        detail: { error: error.message }
      });

      return {
        success: false,
        context: ctx.toObject(),
        history: this.history,
        error: error.message
      };
    }
  }

  private async executeSteps(steps: StepDefinition[], ctx: WorkflowContext, options: ExecutionOptions): Promise<void> {
    for (const step of steps) {
      await this.executeStep(step, ctx, options);
    }
  }

  private async executeStep(step: StepDefinition, ctx: WorkflowContext, options: ExecutionOptions): Promise<void> {
    if (options.verbose) {
      this.logger.info(`▶️  Executing step: ${step.id}`, {
        pluginId: step.pluginId,
        toolId: step.toolId,
        type: step.type || 'task'
      });
    }

    if (step.type === 'parallel' && Array.isArray(step.steps)) {
      await this.executeParallelSteps(step.steps, ctx, options);
    } else {
      await this.executeTaskStep(step, ctx, options);
    }
  }

  private async executeTaskStep(step: StepDefinition, ctx: WorkflowContext, options: ExecutionOptions): Promise<void> {
    const stepExecutor = new TaskStepExecutor(
      this.toolExecutor,
      (event) => this.appendHistory(event)
    );

    try {
      const result = await stepExecutor.execute(step, ctx);

      if (result?.skipped) {
        this.logger.info(`⊘ Step skipped: ${step.id} (condition not met)`);
      } else if (result) {
        // Store result in context for next steps
        ctx.set(`steps.${step.id}.result`, result);

        if (options.verbose) {
          this.logger.info(`✓ Step completed: ${step.id}`, {
            resultKeys: result && typeof result === 'object' ? Object.keys(result) : 'not an object'
          });
        }
      }
    } catch (error: any) {
      this.logger.error(`✗ Step failed: ${step.id}`, {
        error: error.message
      });
      throw new Error(`Step ${step.id} failed: ${error.message}`);
    }
  }

  private async executeParallelSteps(steps: StepDefinition[], ctx: WorkflowContext, options: ExecutionOptions): Promise<void> {
    this.logger.info(`↔️  Executing ${steps.length} steps in parallel`);

    const promises = steps.map(step => this.executeTaskStep(step, ctx, options));
    await Promise.all(promises);

    this.logger.info(`✓ All parallel steps completed`);
  }

  private appendHistory(event: ExecutionEvent): void {
    this.history.push(event);
    if (event.type.startsWith('step.')) {
      // Detailed step logging
      const prefix = event.type === 'step.start' ? '→' : event.type === 'step.complete' ? '→' : '→';
      if (event.message) {
        console.log(`  ${prefix} ${event.message}`);
      }
    }
  }

  getHistory(): ExecutionEvent[] {
    return this.history;
  }

  printSummary(): void {
    console.log('\n' + '='.repeat(60));
    console.log('EXECUTION SUMMARY');
    console.log('='.repeat(60));

    const startEvent = this.history.find(e => e.type === 'workflow.start');
    const endEvent = this.history.find(e => e.type === 'workflow.complete' || e.type === 'workflow.failed');

    if (startEvent && endEvent) {
      const start = new Date(startEvent.timestamp).getTime();
      const end = new Date(endEvent.timestamp).getTime();
      const duration = ((end - start) / 1000).toFixed(2);
      console.log(`Duration: ${duration}s`);
    }

    const completedSteps = this.history.filter(e => e.type === 'step.complete').length;
    const skippedSteps = this.history.filter(e => e.type === 'step.skipped').length;
    const failedSteps = this.history.filter(e => e.type === 'step.failed').length;

    console.log(`Completed Steps: ${completedSteps}`);
    console.log(`Skipped Steps: ${skippedSteps}`);
    console.log(`Failed Steps: ${failedSteps}`);

    console.log('\nStep-by-Step Execution:');
    this.history
      .filter(e => e.type.startsWith('step.'))
      .forEach(event => {
        const icon = event.type === 'step.start' ? '→' : event.type === 'step.complete' ? '✓' : '⊘';
        console.log(`  ${icon} ${event.message}`);
      });

    console.log('='.repeat(60) + '\n');
  }
}
