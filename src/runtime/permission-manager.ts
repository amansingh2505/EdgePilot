export class PermissionManager {
  private granted: Map<string, Set<string>> = new Map();

  // grant permissions to a plugin (id -> permissions array)
  grant(pluginId: string, permissions: string[]) {
    if (!this.granted.has(pluginId)) this.granted.set(pluginId, new Set());
    const s = this.granted.get(pluginId)!;
    for (const p of permissions) s.add(p);
  }

  revoke(pluginId: string, permissions: string[]) {
    const s = this.granted.get(pluginId);
    if (!s) return;
    for (const p of permissions) s.delete(p);
  }

  // check that the plugin has all required permissions
  hasPermissions(pluginId: string, required: string[] = []): boolean {
    if (!required || required.length === 0) return true;
    const s = this.granted.get(pluginId);
    if (!s) return false;
    return required.every(p => s.has(p));
  }

  // get granted permissions
  list(pluginId: string): string[] {
    const s = this.granted.get(pluginId);
    if (!s) return [];
    return Array.from(s);
  }
}
