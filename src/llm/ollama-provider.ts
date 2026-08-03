import { AbstractLLMProvider } from "./provider";
import { ModelInfo, ChatRequest, GenerationRequest, LLMResponse, StreamChunk, HealthStatus } from "./types";
import { retryAsync } from "./retry";

export interface OllamaOptions {
  baseUrl?: string; // default http://localhost:11434
  timeoutMs?: number;
}

export class OllamaProvider extends AbstractLLMProvider {
  name = 'ollama';
  private baseUrl: string;
  private timeoutMs: number;

  constructor(options: OllamaOptions = {}) {
    super();
    this.baseUrl = options.baseUrl || process.env.OLLAMA_URL || 'http://localhost:11434';
    this.timeoutMs = options.timeoutMs || 30_000;
  }

  async healthCheck(): Promise<HealthStatus> {
    try {
      const url = `${this.baseUrl}/health`;
      const resp = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(this.timeoutMs) });
      if (!resp.ok) return { ok: false, info: { status: resp.status } };
      const j = await resp.json().catch(() => ({}));
      return { ok: true, info: j };
    } catch (e: any) {
      return { ok: false, info: { error: String(e) } };
    }
  }

  async listModels(): Promise<ModelInfo[]> {
    return retryAsync(async () => {
      const url = `${this.baseUrl}/api/models`;
      const resp = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(this.timeoutMs) });
      if (!resp.ok) throw new Error(`Failed to list models: ${resp.status}`);
      const j = await resp.json();
      if (Array.isArray(j)) return j.map((m: any) => ({ id: m.name || m.id, name: m.tags?.join(',') || m.name, description: m.description }));
      // try alternative shape
      if (j.models) return j.models.map((m: any) => ({ id: m.name || m.id, name: m.tags?.join(',') || m.name, description: m.description }));
      return [];
    }, 3, 200);
  }

  async generate(req: GenerationRequest): Promise<LLMResponse> {
    return retryAsync(async () => {
      const url = `${this.baseUrl}/api/generate`;
      const body = { model: req.model, prompt: req.prompt, max_tokens: req.maxTokens, temperature: req.temperature };
      const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(this.timeoutMs) });
      if (!resp.ok) throw new Error(`Generate failed: ${resp.status}`);
      const j = await resp.json();
      const text = j?.text ?? (Array.isArray(j) ? j.map((x:any)=>x.text||'').join('') : JSON.stringify(j));
      return { text, structured: j, model: req.model };
    }, 3, 200);
  }

  async chat(req: ChatRequest): Promise<LLMResponse> {
    // map chat messages to prompt format
    const prompt = req.messages.map(m => `${m.role}: ${m.content}`).join('\n');
    return this.generate({ model: req.model, prompt, maxTokens: req.maxTokens, temperature: req.temperature });
  }

  async *streamGenerate(req: GenerationRequest): AsyncIterable<StreamChunk> {
    const url = `${this.baseUrl}/api/generate?stream=true`;
    const body = { model: req.model, prompt: req.prompt, max_tokens: req.maxTokens, temperature: req.temperature };
    const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(this.timeoutMs) });
    if (!resp.ok) throw new Error(`Stream generate failed: ${resp.status}`);
    if (!resp.body) return;
    const reader = resp.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let done = false;
    while (!done) {
      const r = await reader.read();
      done = r.done ?? false;
      if (r.value) {
        const chunk = decoder.decode(r.value);
        yield { text: chunk };
      }
    }
    yield { done: true };
  }

  async *streamChat(req: ChatRequest): AsyncIterable<StreamChunk> {
    const prompt = req.messages.map(m => `${m.role}: ${m.content}`).join('\n');
    for await (const c of this.streamGenerate({ model: req.model, prompt, maxTokens: req.maxTokens, temperature: req.temperature })) {
      yield c;
    }
  }
}
