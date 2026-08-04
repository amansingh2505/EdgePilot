import { ILLMProvider } from './provider';

export class ProviderRegistry {
  private providers: Map<string, ILLMProvider> = new Map();

  register(provider: ILLMProvider) {
    if (this.providers.has(provider.name)) throw new Error(`Provider ${provider.name} already registered`);
    this.providers.set(provider.name, provider);
  }

  get(name: string): ILLMProvider | undefined { return this.providers.get(name); }

  list(): ILLMProvider[] { return Array.from(this.providers.values()); }
}
