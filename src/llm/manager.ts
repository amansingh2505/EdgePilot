import { ProviderRegistry } from './registry';
import { loadLLMConfig, LLMConfig, ProviderConfig } from './config';
import { ILLMProvider } from './provider';
import { ConsoleLogger } from '../runtime/logger';
import { OllamaProvider } from './ollama-provider';
import { LocalProvider } from './local-provider';

export class ProviderManager {
  private registry = new ProviderRegistry();
  private logger = new ConsoleLogger();
  private defaultProviderName?: string;
  private defaultModel?: string;
  private config: LLMConfig;

  constructor() {
    this.config = loadLLMConfig();
    this.defaultProviderName = this.config.defaultProvider;
    this.defaultModel = this.config.defaultModel;
    this.initializeProviders(this.config.providers || []);
  }

  register(provider: ILLMProvider) {
    this.registry.register(provider);
    this.logger.info(`Registered provider ${provider.name}`);
  }

  listProviders(): ILLMProvider[] { return this.registry.list(); }

  getProvider(name?: string): ILLMProvider | undefined {
    if (!name) name = this.defaultProviderName;
    if (!name) return this.registry.list()[0];
    return this.registry.get(name);
  }

  setDefault(name: string) { this.defaultProviderName = name; }

  getDefaultModel(name?: string): string | undefined {
    const providerName = name || this.defaultProviderName;
    if (providerName) {
      const providerConfig = this.config.providers?.find((p) => p.name === providerName);
      if (providerConfig?.options?.model) return providerConfig.options.model;
    }
    return this.defaultModel;
  }

  private initializeProviders(providers: ProviderConfig[]): void {
    providers.forEach((providerConfig) => {
      if (providerConfig.enabled === false) return;
      if (providerConfig.type === 'ollama') {
        const provider = new OllamaProvider({
          baseUrl: providerConfig.options?.baseUrl,
          timeoutMs: providerConfig.options?.timeoutMs
        });

        if (providerConfig.name && providerConfig.name !== provider.name) {
          (provider as any).name = providerConfig.name;
        }

        this.register(provider);
      } else if (providerConfig.type === 'local') {
        const provider = new LocalProvider({
          command: providerConfig.options?.command,
          args: providerConfig.options?.args,
          model: providerConfig.options?.model,
          timeoutMs: providerConfig.options?.timeoutMs,
          sendPromptViaStdin: providerConfig.options?.sendPromptViaStdin,
          promptArg: providerConfig.options?.promptArg
        });

        if (providerConfig.name && providerConfig.name !== provider.name) {
          (provider as any).name = providerConfig.name;
        }

        this.register(provider);
      }
    });
  }
}
