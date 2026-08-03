export interface LLMResponse {
  text: string;
  structured?: any;
}

export interface ILLMProvider {
  // sends a prompt and returns an abstract response
  generate(prompt: string, options?: { maxTokens?: number }): Promise<LLMResponse>;
}
