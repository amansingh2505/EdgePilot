export interface Logger {
  info(...args: any[]): void;
  warn(...args: any[]): void;
  error(...args: any[]): void;
  debug(...args: any[]): void;
}

export class ConsoleLogger implements Logger {
  info(...args: any[]) { console.info(...args); }
  warn(...args: any[]) { console.warn(...args); }
  error(...args: any[]) { console.error(...args); }
  debug(...args: any[]) { console.debug(...args); }
}
