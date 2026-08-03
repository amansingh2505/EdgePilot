import get from 'lodash.get';

export class WorkflowContext {
  private store: { [k: string]: any } = {};

  constructor(initial: { [k: string]: any } = {}) { this.store = { ...initial }; }

  get(path: string, fallback?: any) { return get(this.store, path, fallback); }
  set(path: string, value: any) {
    const parts = path.split('.');
    let cur: any = this.store;
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i];
      if (!(p in cur)) cur[p] = {};
      cur = cur[p];
    }
    cur[parts[parts.length - 1]] = value;
  }

  toObject() { return JSON.parse(JSON.stringify(this.store)); }

  // simple templating: replace ${path} with value from context
  interpolate(input: any): any {
    if (typeof input === 'string') {
      return input.replace(/\$\{([^}]+)\}/g, (_, p) => {
        const v = get(this.store, p.trim());
        return v === undefined || v === null ? '' : String(v);
      });
    }
    if (Array.isArray(input)) return input.map(i => this.interpolate(i));
    if (input && typeof input === 'object') {
      const out: any = {};
      for (const k of Object.keys(input)) out[k] = this.interpolate((input as any)[k]);
      return out;
    }
    return input;
  }
}
