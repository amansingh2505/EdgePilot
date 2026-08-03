import { StorageInterface, MemoryManagerOptions, ScopeSnapshot, VariableStore, ScopeType, MemoryContextIds } from './types';
import { InMemoryStorage } from './in-memory-storage';

export class MemoryScope implements VariableStore {
  constructor(private storage: StorageInterface, private scope: ScopeType, private id: string) {}

  async setVariable(key: string, value: any, ttlMs: number | null = null) {
    await this.storage.put(this.scope, this.id, key, value, ttlMs);
  }

  async getVariable(key: string) {
    return await this.storage.get(this.scope, this.id, key);
  }

  async deleteVariable(key: string) {
    return await this.storage.delete(this.scope, this.id, key);
  }

  async listKeys() {
    return await this.storage.listKeys(this.scope, this.id);
  }

  async clear() {
    await this.storage.clearScope(this.scope, this.id);
  }

  async snapshot() {
    return await this.storage.snapshotScope(this.scope, this.id);
  }
}

export class MemoryContext {
  constructor(private manager: MemoryManager, private ids: MemoryContextIds) {}

  async inject(template: any) {
    return await this.manager.injectContext(template, this.ids);
  }

  async lookup(key: string) {
    return await this.manager.lookupValue(key, this.ids);
  }
}

export class MemoryManager {
  private storage: StorageInterface;

  constructor(storage?: StorageInterface, _opts?: MemoryManagerOptions) {
    this.storage = storage || new InMemoryStorage();
  }

  session(sessionId: string) {
    return new MemoryScope(this.storage, 'session', sessionId);
  }

  conversation(conversationId: string) {
    return new MemoryScope(this.storage, 'conversation', conversationId);
  }

  workflow(workflowId: string) {
    return new MemoryScope(this.storage, 'workflow', workflowId);
  }

  global() {
    return new MemoryScope(this.storage, 'global', 'global');
  }

  context(ids: MemoryContextIds) {
    return new MemoryContext(this, ids);
  }

  async snapshotScope(scope: ScopeType, id: string): Promise<ScopeSnapshot> {
    return await this.storage.snapshotScope(scope, id);
  }

  async restoreScope(snapshot: ScopeSnapshot) {
    return await this.storage.restoreScope(snapshot);
  }

  exportAll(): any {
    if ((this.storage as any).toJSON) return (this.storage as any).toJSON();
    return null;
  }

  importAll(obj: any) {
    if ((this.storage as any).fromJSON) (this.storage as any).fromJSON(obj);
  }

  async injectContext(template: any, ids: { workflowId?: string; conversationId?: string; sessionId?: string }) {
    if (template === null || template === undefined) return template;
    if (typeof template === 'string') {
      return await this.interpolateString(template, ids);
    }
    if (Array.isArray(template)) return await Promise.all(template.map(t => this.injectContext(t, ids)));
    if (typeof template === 'object') {
      const out: any = {};
      for (const k of Object.keys(template)) {
        out[k] = await this.injectContext((template as any)[k], ids);
      }
      return out;
    }
    return template;
  }

  private async interpolateString(str: string, ids: { workflowId?: string; conversationId?: string; sessionId?: string }) {
    const regex = /\$\{([^}]+)\}/g;
    let match: RegExpExecArray | null;
    let lastIndex = 0;
    let result = '';

    while ((match = regex.exec(str)) !== null) {
      result += str.slice(lastIndex, match.index);
      const key = match[1].trim();
      const value = await this.lookupValue(key, ids);
      result += value === undefined || value === null ? '' : String(value);
      lastIndex = regex.lastIndex;
    }

    result += str.slice(lastIndex);
    return result;
  }

  async lookupValue(key: string, ids: { workflowId?: string; conversationId?: string; sessionId?: string }) {
    const { workflowId, conversationId, sessionId } = ids;
    if (workflowId) {
      const v = await this.storage.get('workflow', workflowId, key);
      if (v !== undefined) return v;
    }
    if (conversationId) {
      const v = await this.storage.get('conversation', conversationId, key);
      if (v !== undefined) return v;
    }
    if (sessionId) {
      const v = await this.storage.get('session', sessionId, key);
      if (v !== undefined) return v;
    }
    return undefined;
  }
}
