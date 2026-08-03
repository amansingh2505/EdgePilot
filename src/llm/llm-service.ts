import { ILLMProvider } from './provider';
import { ConsoleLogger } from '../runtime/logger';

export interface SummarizationResult {
  title: string;
  summary: string;
}

export class LLMService {
  private provider: ILLMProvider;
  private logger = new ConsoleLogger();
  private model: string;

  constructor(provider: ILLMProvider, model: string = 'mistral') {
    this.provider = provider;
    this.model = model;
  }

  async checkHealth(): Promise<boolean> {
    try {
      const health = await this.provider.healthCheck();
      this.logger.info(`LLM Health Check: ${health.ok ? 'OK' : 'FAILED'}`, health.info);
      return health.ok;
    } catch (error: any) {
      this.logger.error('LLM health check failed:', error.message);
      return false;
    }
  }

  async listModels(): Promise<string[]> {
    const models = await this.provider.listModels();
    const modelNames = models.map((m) => m.id);
    this.logger.info(`Available models: ${modelNames.join(', ')}`);
    return modelNames;
  }

  async summarize(filePath: string, content: string, useStream = false): Promise<SummarizationResult> {
    const prompt = `Please provide a brief, concise summary (2-3 sentences) of the following text from file "${filePath}":

${content.slice(0, 2000)}${content.length > 2000 ? '...' : ''}

Summary:`;

    this.logger.info(`Summarizing ${filePath}...`);

    try {
      let text = '';

      if (useStream && typeof this.provider.streamGenerate === 'function') {
        for await (const chunk of this.provider.streamGenerate({
          model: this.model,
          prompt,
          maxTokens: 200,
          temperature: 0.3
        })) {
          if (chunk.text) text += chunk.text;
        }
      } else {
        const response = await this.provider.generate({
          model: this.model,
          prompt,
          maxTokens: 200,
          temperature: 0.3
        });
        text = response.text;
      }

      return {
        title: filePath,
        summary: text.trim()
      };
    } catch (error: any) {
      this.logger.error(`Failed to summarize ${filePath}:`, error.message);
      return {
        title: filePath,
        summary: `[Error summarizing file: ${error.message}]`
      };
    }
  }

  async summarizeMultiple(files: Array<{ path: string; content: string }>, useStream = false): Promise<SummarizationResult[]> {
    const results: SummarizationResult[] = [];
    for (const file of files) {
      const result = await this.summarize(file.path, file.content, useStream);
      results.push(result);
    }
    return results;
  }
}
