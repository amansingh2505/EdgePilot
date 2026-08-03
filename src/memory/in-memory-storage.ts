import { ScopeType, MemoryRecord, ScopeSnapshot, StorageInterface } from './types';
import { Mutex } from './storage';

type RecordsMap = Map<string, MemoryRecord>;

export class InMemoryStorage implements StorageInterface {
  private store: Map<string, RecordsMap> = new Map(); // key = `${scope}:${id}`
  private mutex = new Mutex();
  private cleanupIntervalId: NodeJS.Timeout | null = null;

  constructor(private cleanupIntervalMs = 5 * 60 * 1000) {
    this.startCleanup();
  }

  private scopeKey(scope: ScopeType, id: string) {
    return `${scope}:${id}`;
  }

  private getRecordsMap(scope: ScopeType, id: string): RecordsMap {
    const sk = this.scopeKey(scope, id);
    let m = this.store.get(sk);
    if (!m) { m = new Map(); this.store.set(sk, m); }
    return m;
  }

  async put(scope: ScopeType, id: string, key: string, value: any, ttlMs: number | null = null): Promise<void> {
    return this.mutex.acquire(this.scopeKey(scope, id), async () => {
      const m = this.getRecordsMap(scope, id);
      const rec: MemoryRecord = { key, value, expiresAt: ttlMs ? Date.now() + ttlMs : null };
      m.set(key, rec);
    });
  }

  async get(scope: ScopeType, id: string, key: string): Promise<any | undefined> {
    return this.mutex.acquire(this.scopeKey(scope, id), async () => {
      const m = this.getRecordsMap(scope, id);
      const rec = m.get(key);
      if (!rec) return undefined;
      if (rec.expiresAt && rec.expiresAt < Date.now()) { m.delete(key); return undefined; }
      return rec.value;
    });
  }

  async delete(scope: ScopeType, id: string, key: string): Promise<boolean> {
    return this.mutex.acquire(this.scopeKey(scope, id), async () => {
      const m = this.getRecordsMap(scope, id);
      return m.delete(key);
    });
  }

  async listKeys(scope: ScopeType, id: string): Promise<string[]> {
    return this.mutex.acquire(this.scopeKey(scope, id), async () => {
      const m = this.getRecordsMap(scope, id);
      const now = Date.now();
      const keys: string[] = [];
      for (const [k, rec] of m.entries()) {
        if (rec.expiresAt && rec.expiresAt < now) { m.delete(k); continue; }
        keys.push(k);
      }
      return keys;
    });
  }

  async snapshotScope(scope: ScopeType, id: string): Promise<ScopeSnapshot> {
    return this.mutex.acquire(this.scopeKey(scope, id), async () => {
      const m = this.getRecordsMap(scope, id);
      return {
        scope,
        id,
        records: Array.from(m.values()).map(r => ({ key: r.key, value: r.value, expiresAt: r.expiresAt }))
      };
    });
  }

  async restoreScope(snapshot: ScopeSnapshot): Promise<void> {
    const key = this.scopeKey(snapshot.scope, snapshot.id);
    return this.mutex.acquire(key, async () => {
      const m = new Map<string, MemoryRecord>();
      for (const r of snapshot.records) m.set(r.key, { key: r.key, value: r.value, expiresAt: r.expiresAt });
      this.store.set(key, m);
    });
  }

  async clearScope(scope: ScopeType, id: string): Promise<void> {
    return this.mutex.acquire(this.scopeKey(scope, id), async () => {
      this.store.delete(this.scopeKey(scope, id));
    });
  }

  private startCleanup() {
    if (this.cleanupIntervalId) return;
    this.cleanupIntervalId = setInterval(() => this.cleanupExpired(), this.cleanupIntervalMs);
  }

  private async cleanupExpired() {
    const now = Date.now();
    for (const [sk, m] of this.store.entries()) {
      await this.mutex.acquire(sk, async () => {
        for (const [k, rec] of m.entries()) {
          if (rec.expiresAt && rec.expiresAt < now) m.delete(k);
        }
      });
    }
  }

  // serialization: export all scopes
  toJSON(): any {
    const out: any = {};
    for (const [sk, m] of this.store.entries()) {
      out[sk] = Array.from(m.values()).map(r => ({ key: r.key, value: r.value, expiresAt: r.expiresAt }));
    }
    return out;
  }

  fromJSON(obj: any) {
    for (const sk of Object.keys(obj)) {
      const arr: any[] = obj[sk];
      const m = new Map<string, MemoryRecord>();
      for (const r of arr) m.set(r.key, { key: r.key, value: r.value, expiresAt: r.expiresAt });
      this.store.set(sk, m);
    }
  }
}
