import { PluginManifest } from "./types";
import { ConsoleLogger } from "./logger";

export type PluginWrapper = {
  manifest: PluginManifest;
  module?: any;
  tools: any[];
  initialize?: Function;
  shutdown?: Function;
};

export class PluginManager {
  private plugins: Map<string, PluginWrapper> = new Map();
  private logger = new ConsoleLogger();

  register(wrapper: PluginWrapper) {
    const id = wrapper.manifest?.id;
    if (!id) throw new Error('Plugin manifest must contain id');
    if (this.plugins.has(id)) throw new Error(`Plugin ${id} already registered`);
    if (!Array.isArray(wrapper.tools)) throw new Error('Plugin wrapper.tools must be an array');
    this.plugins.set(id, wrapper);
    this.logger.info(`Registered plugin ${id}`);
    return id;
  }

  getPlugin(pluginId: string): PluginWrapper | undefined {
    return this.plugins.get(pluginId);
  }

  getTool(pluginId: string, toolId: string): any | undefined {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return undefined;
    // tools are objects with id and execute function or simple callables
    for (const t of plugin.tools) {
      if (t && (t.id === toolId || t.id === `${pluginId}.${toolId}`)) return t;
    }
    return undefined;
  }

  listPlugins(): PluginManifest[] {
    return Array.from(this.plugins.values()).map(p => p.manifest);
  }
}
