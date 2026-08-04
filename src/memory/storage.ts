// Small mutex to provide simple async locking per key
export class Mutex {
  private locks: Map<string, Promise<void>> = new Map();

  async acquire<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const prior = this.locks.get(key) ?? Promise.resolve();
    let release: () => void;
    const p = new Promise<void>(res => (release = res));
    this.locks.set(key, prior.then(() => p));
    try {
      const result = await fn();
      return result;
    } finally {
      // release and cleanup
      release!();
      // if current lock resolved, remove
      const cur = this.locks.get(key);
      if (cur === p) this.locks.delete(key);
    }
  }
}

import { ScopeType, MemoryRecord, ScopeSnapshot, StorageInterface } from './types';

export abstract class AbstractStorage implements StorageInterface {
  abstract put(scope: ScopeType, id: string, key: string, value: any, ttlMs?: number | null): Promise<void>;
  abstract get(scope: ScopeType, id: string, key: string): Promise<any | undefined>;
  abstract delete(scope: ScopeType, id: string, key: string): Promise<boolean>;
  abstract listKeys(scope: ScopeType, id: string): Promise<string[]>;
  abstract snapshotScope(scope: ScopeType, id: string): Promise<ScopeSnapshot>;
  abstract restoreScope(snapshot: ScopeSnapshot): Promise<void>;
  abstract clearScope(scope: ScopeType, id: string): Promise<void>;
}
