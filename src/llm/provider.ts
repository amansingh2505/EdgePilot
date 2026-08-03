import { ModelInfo, ChatRequest, GenerationRequest, LLMResponse, StreamChunk, HealthStatus } from './types';

export interface ILLMProvider {
  name: string;
  healthCheck(): Promise<HealthStatus>;
  listModels(): Promise<ModelInfo[]>;
  chat(req: ChatRequest): Promise<LLMResponse>;
  generate(req: GenerationRequest): Promise<LLMResponse>;
  streamChat?(req: ChatRequest): AsyncIterable<StreamChunk>;
  streamGenerate?(req: GenerationRequest): AsyncIterable<StreamChunk>;
}

export abstract class AbstractLLMProvider implements ILLMProvider {
  abstract name: string;
  abstract healthCheck(): Promise<HealthStatus>;
  abstract listModels(): Promise<ModelInfo[]>;
  abstract chat(req: ChatRequest): Promise<LLMResponse>;
  abstract generate(req: GenerationRequest): Promise<LLMResponse>;
  streamChat?(req: ChatRequest): AsyncIterable<StreamChunk>;
  streamGenerate?(req: GenerationRequest): AsyncIterable<StreamChunk>;
}
