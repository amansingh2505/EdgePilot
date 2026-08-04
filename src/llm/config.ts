import fs from 'fs';
import path from 'path';

export interface ProviderConfig {
  name: string;
  type: string; // e.g., 'ollama'
  enabled?: boolean;
  options?: { [k: string]: any };
}

export interface LLMConfig {
  defaultProvider?: string;
  defaultModel?: string;
  providers?: ProviderConfig[];
}

export function loadLLMConfig(): LLMConfig {
  const cfgPath = path.join(process.cwd(), 'llm-config.json');
  if (fs.existsSync(cfgPath)) {
    const raw = fs.readFileSync(cfgPath, 'utf-8');
    try { return JSON.parse(raw) as LLMConfig; } catch (e) { return { providers: [] }; }
  }

  const baseUrl = process.env.OLLAMA_URL;
  const model = process.env.OLLAMA_MODEL;
  const defaultProvider = process.env.LLM_DEFAULT_PROVIDER || (baseUrl ? 'ollama' : undefined);
  const providers = baseUrl ? [{
    name: 'ollama',
    type: 'ollama',
    enabled: true,
    options: { baseUrl, model }
  }] : [];

  return {
    defaultProvider,
    defaultModel: model,
    providers
  };
}
