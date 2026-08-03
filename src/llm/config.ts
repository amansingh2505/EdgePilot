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
  providers?: ProviderConfig[];
}

export function loadLLMConfig(): LLMConfig {
  const cfgPath = path.join(process.cwd(), 'llm-config.json');
  if (!fs.existsSync(cfgPath)) return { providers: [] };
  const raw = fs.readFileSync(cfgPath, 'utf-8');
  try { return JSON.parse(raw) as LLMConfig; } catch (e) { return { providers: [] }; }
}
