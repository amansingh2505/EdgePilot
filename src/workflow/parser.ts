import fs from 'fs';
import yaml from 'js-yaml';
import { WorkflowDefinition } from './types';

export function loadWorkflowFromFile(path: string): WorkflowDefinition {
  const raw = fs.readFileSync(path, 'utf-8');
  if (path.endsWith('.yaml') || path.endsWith('.yml')) return yaml.load(raw) as WorkflowDefinition;
  return JSON.parse(raw) as WorkflowDefinition;
}

export function validateWorkflow(def: WorkflowDefinition): void {
  if (!def || !Array.isArray(def.steps)) throw new Error('Invalid workflow: missing steps');
  // minimal validation
  const seen = new Set<string>();
  function walk(steps: any[]) {
    for (const s of steps) {
      if (!s.id) throw new Error('Step missing id');
      if (seen.has(s.id)) throw new Error(`Duplicate step id: ${s.id}`);
      seen.add(s.id);
      if (s.type === 'parallel' && !Array.isArray(s.steps)) throw new Error(`Parallel step ${s.id} missing steps`);
      if (s.steps) walk(s.steps);
    }
  }
  walk(def.steps);
}
