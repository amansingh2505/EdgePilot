import { OllamaProvider } from '../llm/ollama-provider';
import { ConsoleLogger } from '../runtime/logger';

export interface SummarizationResult {
  title: string;
  summary: string;
}

export class LLMService {
  private provider: OllamaProvider;
  private logger = new ConsoleLogger();
  private model: string;

  constructor(model: string = 'mistral', baseUrl?: string) {
    this.model = model;
    this.provider = new OllamaProvider({ baseUrl });
  }

  async checkHealth(): Promise<boolean> {
    const health = await this.provider.healthCheck();
    this.logger.info(`LLM Health Check: ${health.ok ? 'OK' : 'FAILED'}`, health.info);
    return health.ok;
  }

  async listModels(): Promise<string[]> {
    const models = await this.provider.listModels();
    const modelNames = models.map(m => m.id);
    this.logger.info(`Available models: ${modelNames.join(', ')}`);
    return modelNames;
  }

  async summarize(filePath: string, content: string): Promise<SummarizationResult> {
    try {
      const prompt = `Please provide a brief, concise summary (2-3 sentences) of the following text from file "${filePath}":

${content.slice(0, 2000)}${content.length > 2000 ? '...' : ''}

Summary:`;

      this.logger.info(`Summarizing ${filePath}...`);
      
      const response = await this.provider.generate({
        model: this.model,
        prompt,
        maxTokens: 200,
        temperature: 0.3
      });

      return {
        title: filePath,
        summary: response.text.trim()
      };
    } catch (error: any) {
      this.logger.error(`Failed to summarize ${filePath}:`, error.message);
      return {
        title: filePath,
        summary: `[Error summarizing file: ${error.message}]`
      };
    }
  }

  async summarizeMultiple(files: Array<{ path: string; content: string }>): Promise<SummarizationResult[]> {
    const results: SummarizationResult[] = [];
    for (const file of files) {
      const result = await this.summarize(file.path, file.content);
      results.push(result);
    }
    return results;
  }
}
