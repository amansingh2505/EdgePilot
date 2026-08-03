import fs from 'fs';
import path from 'path';
import { ExecutionEvent } from './types';

export class FileHistoryStore {
  constructor(private baseDir = path.join(process.cwd(), 'workflows', 'history')) {
    fs.mkdirSync(this.baseDir, { recursive: true });
  }

  async append(executionId: string, event: ExecutionEvent): Promise<void> {
    const file = path.join(this.baseDir, `${executionId}.log`);
    const line = JSON.stringify(event) + '\n';
    await fs.promises.appendFile(file, line, { encoding: 'utf-8' });
  }
}
