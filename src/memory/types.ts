export type ScopeType = 'session' | 'conversation' | 'workflow' | 'global';

export interface MemoryRecord {
  key: string;
  value: any;
  expiresAt?: number | null; // epoch ms
}

export interface ScopeSnapshot {
  scope: ScopeType;
  id: string;
  records: MemoryRecord[];
}

export interface VariableStore {
  setVariable(key: string, value: any, ttlMs?: number | null): Promise<void>;
  getVariable(key: string): Promise<any | undefined>;
  deleteVariable(key: string): Promise<boolean>;
  listKeys(): Promise<string[]>;
  clear(): Promise<void>;
  snapshot(): Promise<ScopeSnapshot>;
}

export interface MemoryContextIds {
  workflowId?: string;
  conversationId?: string;
  sessionId?: string;
}

export interface StorageInterface {
  put(scope: ScopeType, id: string, key: string, value: any, ttlMs?: number | null): Promise<void>;
  get(scope: ScopeType, id: string, key: string): Promise<any | undefined>;
  delete(scope: ScopeType, id: string, key: string): Promise<boolean>;
  listKeys(scope: ScopeType, id: string): Promise<string[]>;
  snapshotScope(scope: ScopeType, id: string): Promise<ScopeSnapshot>;
  restoreScope(snapshot: ScopeSnapshot): Promise<void>;
  clearScope(scope: ScopeType, id: string): Promise<void>;
}

export interface MemoryManagerOptions {
  cleanupIntervalMs?: number;
}
