export interface ModelInfo {
  id: string;
  name?: string;
  description?: string;
  tags?: string[];
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
}

export interface LLMResponse {
  text: string;
  structured?: any;
  model?: string;
  usage?: any;
}

export interface StreamChunk {
  id?: string;
  text?: string;
  done?: boolean;
  delta?: any;
}

export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
  stop?: string[];
}

export interface GenerationRequest {
  model: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  stop?: string[];
}

export interface HealthStatus {
  ok: boolean;
  info?: any;
}
