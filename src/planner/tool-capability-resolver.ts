import { PluginManager } from "../runtime/plugin-manager";

export class ToolCapabilityResolver {
  constructor(private pm: PluginManager) {}

  // find tools that match a capability keyword (very simple matching for now)
  findToolsByKeyword(keyword: string): Array<{ pluginId: string; toolId: string }> {
    const results: Array<{ pluginId: string; toolId: string }> = [];
    for (const p of this.pm.listPlugins()) {
      for (const t of p.tools || []) {
        // t may be manifest tool or module tool; inspect id and name
        const name = (t.name || t.id || '').toLowerCase();
        if (name.includes(keyword.toLowerCase()) || (p.name || '').toLowerCase().includes(keyword.toLowerCase())) {
          results.push({ pluginId: p.id, toolId: t.id });
        }
      }
    }
    return results;
  }

  // check tool exists
  toolExists(pluginId: string, toolId: string): boolean {
    const t = this.pm.getTool(pluginId, toolId);
    return !!t;
  }
}
