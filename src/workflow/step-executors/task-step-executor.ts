import { StepDefinition, ExecutionEvent } from '../workflow/types';
import { IToolExecutor } from './executor_interfaces';
import { WorkflowContext } from './context';

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

export class TaskStepExecutor {
  constructor(private toolExecutor: IToolExecutor, private historyAppend: (ev: ExecutionEvent)=>Promise<void>) {}

  private async runWithRetries(fn: ()=>Promise<any>, retries?: any) {
    const attempts = retries?.attempts ?? 1;
    const delay = retries?.delayMs ?? 0;
    const backoff = retries?.backoff ?? 'linear';
    let lastErr: any;
    for (let i=0;i<attempts;i++) {
      try {
        return await fn();
      } catch (e) {
        lastErr = e;
        if (i < attempts - 1) {
          const d = backoff === 'exponential' ? delay * Math.pow(2, i) : delay;
          await sleep(d);
        }
      }
    }
    throw lastErr;
  }

  async execute(step: StepDefinition, ctx: WorkflowContext): Promise<any> {
    // evaluate condition
    if (step.condition) {
      const val = ctx.get(step.condition.path);
      const op = step.condition.operator || 'exists';
      const should = evaluateCondition(val, op, step.condition.value);
      if (!should) {
        await this.historyAppend({ timestamp: new Date().toISOString(), type: 'step.skipped', message: `Condition failed for ${step.id}` });
        return { skipped: true };
      }
    }

    const input = ctx.interpolate(step.input || {});

    const execFn = async () => {
      await this.historyAppend({ timestamp: new Date().toISOString(), type: 'step.start', message: `Starting ${step.id}` });
      const result = await this.toolExecutor.execute(step.pluginId || '', step.toolId || '', input);
      await this.historyAppend({ timestamp: new Date().toISOString(), type: 'step.complete', message: `Completed ${step.id}`, detail: result });
      return result;
    };

    if (step.timeoutMs) {
      return this.runWithTimeout(()=>this.runWithRetries(execFn, step.retries), step.timeoutMs);
    }
    return this.runWithRetries(execFn, step.retries);
  }

  private async runWithTimeout(fn: ()=>Promise<any>, timeoutMs: number) {
    return Promise.race([fn(), new Promise((_, rej) => setTimeout(()=>rej(new Error('timeout')), timeoutMs))]);
  }
}

function evaluateCondition(val: any, op: string, expected: any) {
  switch (op) {
    case 'exists': return val !== undefined && val !== null;
    case '==': return val == expected;
    case '!=': return val != expected;
    case '>': return val > expected;
    case '>=': return val >= expected;
    case '<': return val < expected;
    case '<=': return val <= expected;
    case 'in': return Array.isArray(expected) && expected.includes(val);
    default: return false;
  }
}
