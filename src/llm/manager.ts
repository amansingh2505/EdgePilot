import { ProviderRegistry } from './registry';
import { loadLLMConfig } from './config';
import { ILLMProvider } from './provider';
import { ConsoleLogger } from '../runtime/logger';

export class ProviderManager {
  private registry = new ProviderRegistry();
  private logger = new ConsoleLogger();
  private defaultProviderName?: string;

  register(provider: ILLMProvider) {
    this.registry.register(provider);
    this.logger.info(`Registered provider ${provider.name}`);
  }

  listProviders(): ILLMProvider[] { return this.registry.list(); }

  getProvider(name?: string): ILLMProvider | undefined {
    if (!name) name = this.defaultProviderName || loadLLMConfig().defaultProvider;
    return name ? this.registry.get(name) : undefined;
  }

  setDefault(name: string) { this.defaultProviderName = name; }
}
