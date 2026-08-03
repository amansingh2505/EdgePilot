import { Plugin, PluginManifest, ToolDefinition } from "./types";
import { ConsoleLogger } from "./logger";

export class PluginManager {
  private plugins: Map<string, Plugin> = new Map();
  private logger = new ConsoleLogger();

  register(plugin: Plugin) {
    const id = plugin.manifest.id;
    if (!id) throw new Error('Plugin manifest must contain id');
    if (this.plugins.has(id)) throw new Error(`Plugin ${id} already registered`);
    // basic sanity checks
    if (!Array.isArray(plugin.manifest.tools)) throw new Error('Plugin manifest.tools must be an array');
    this.plugins.set(id, plugin);
    this.logger.info(`Registered plugin ${id}`);
    return id;
  }

  getPlugin(pluginId: string): Plugin | undefined {
    return this.plugins.get(pluginId);
  }

  getTool(pluginId: string, toolId: string): any | undefined {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return undefined;
    // tools might be objects with id or functions; normalize
    for (const t of plugin.tools) {
      if ((t as any).id === toolId) return t;
    }
    return undefined;
  }

  listPlugins(): PluginManifest[] {
    return Array.from(this.plugins.values()).map(p => p.manifest);
  }
}
