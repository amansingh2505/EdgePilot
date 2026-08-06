import { spawn } from 'child_process';
import { AbstractLLMProvider } from './provider';
import { ModelInfo, ChatRequest, GenerationRequest, LLMResponse, StreamChunk, HealthStatus } from './types';

export interface LocalProviderOptions {
  command?: string;
  args?: string[];
  model?: string;
  timeoutMs?: number;
  sendPromptViaStdin?: boolean;
  promptArg?: string;
}

export class LocalProvider extends AbstractLLMProvider {
  name = 'local';
  private command: string;
  private args: string[];
  private timeoutMs: number;
  private modelName?: string;
  private sendPromptViaStdin: boolean;
  private promptArg?: string;

  constructor(options: LocalProviderOptions = {}) {
    super();
    this.command = options.command || process.env.LOCAL_LLM_COMMAND || 'echo';
    this.args = options.args || [];
    this.timeoutMs = options.timeoutMs || 30000;
    this.modelName = options.model || process.env.LOCAL_LLM_MODEL;
    this.sendPromptViaStdin = options.sendPromptViaStdin ?? true;
    this.promptArg = options.promptArg;
  }

  async healthCheck(): Promise<HealthStatus> {
    try {
      const helpArgs = ['--help'];
      const child = spawn(this.command, helpArgs, { shell: true, stdio: ['ignore', 'pipe', 'ignore'] });
      let output = '';
      child.stdout.on('data', (chunk) => { output += chunk.toString(); });
      const result = await new Promise<{ code: number | null }>((resolve, reject) => {
        child.on('close', (code) => resolve({ code }));
        child.on('error', reject);
        setTimeout(() => {
          child.kill();
          resolve({ code: null });
        }, Math.min(this.timeoutMs, 5000));
      });
      return { ok: true, info: { code: result.code, output: output.trim().slice(0, 500) } };
    } catch (e: any) {
      return { ok: false, info: { error: String(e) } };
    }
  }

  async listModels(): Promise<ModelInfo[]> {
    return [{ id: this.modelName || 'local-model', name: this.modelName || 'local-model', description: 'Local command-line model' }];
  }

  async generate(req: GenerationRequest): Promise<LLMResponse> {
    const prompt = req.prompt;
    const text = await this.runCommand(prompt);
    return { text, structured: { model: this.modelName, prompt }, model: this.modelName };
  }

  async chat(req: ChatRequest): Promise<LLMResponse> {
    const prompt = req.messages.map((m) => `${m.role}: ${m.content}`).join('\n');
    return this.generate({ model: req.model, prompt, maxTokens: req.maxTokens, temperature: req.temperature });
  }

  async *streamGenerate(req: GenerationRequest): AsyncIterable<StreamChunk> {
    const response = await this.generate(req);
    yield { text: response.text };
    yield { done: true };
  }

  async *streamChat(req: ChatRequest): AsyncIterable<StreamChunk> {
    const response = await this.chat(req);
    yield { text: response.text };
    yield { done: true };
  }

  private async runCommand(prompt: string): Promise<string> {
    const args = [...this.args];
    if (this.promptArg) {
      for (let i = 0; i < args.length; i += 1) {
        if (args[i] === '${prompt}') {
          args[i] = prompt;
        }
      }
    }

    const child = spawn(this.command, args, { shell: true, stdio: ['pipe', 'pipe', 'pipe'] });
    let output = '';
    let errorOutput = '';

    child.stdout.on('data', (chunk) => { output += chunk.toString(); });
    child.stderr.on('data', (chunk) => { errorOutput += chunk.toString(); });

    if (this.sendPromptViaStdin) {
      child.stdin.write(prompt);
      child.stdin.end();
    }

    const result = await new Promise<{ code: number | null }>((resolve, reject) => {
      child.on('close', (code) => resolve({ code }));
      child.on('error', reject);
      setTimeout(() => {
        child.kill();
        resolve({ code: null });
      }, this.timeoutMs);
    });

    if (result.code !== 0) {
      throw new Error(`Local provider failed (code=${result.code}): ${errorOutput.trim()}`);
    }

    return output.trim();
  }
}
