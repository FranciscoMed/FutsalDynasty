/**
 * Logger Utility
 * Provides consistent logging throughout the scraper
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export class Logger {
  private level: LogLevel;
  private prefix: string;

  constructor(prefix: string = 'UEFA-Scraper', level: LogLevel = LogLevel.INFO) {
    this.prefix = prefix;
    this.level = level;
  }

  private log(level: LogLevel, message: string, ...args: any[]): void {
    if (level < this.level) return;

    const timestamp = new Date().toISOString();
    const levelName = LogLevel[level];
    const formattedMessage = `[${timestamp}] [${this.prefix}] [${levelName}] ${message}`;

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formattedMessage, ...args);
        break;
      case LogLevel.INFO:
        console.log(formattedMessage, ...args);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage, ...args);
        break;
      case LogLevel.ERROR:
        console.error(formattedMessage, ...args);
        break;
    }
  }

  debug(message: string, ...args: any[]): void {
    this.log(LogLevel.DEBUG, message, ...args);
  }

  info(message: string, ...args: any[]): void {
    this.log(LogLevel.INFO, message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    this.log(LogLevel.WARN, message, ...args);
  }

  error(message: string, ...args: any[]): void {
    this.log(LogLevel.ERROR, message, ...args);
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }
}

/**
 * Progress bar for terminal
 */
export class ProgressBar {
  private total: number;
  private current: number = 0;
  private startTime: number;
  private label: string;

  constructor(total: number, label: string = 'Progress') {
    this.total = total;
    this.label = label;
    this.startTime = Date.now();
  }

  update(current: number): void {
    this.current = current;
    this.render();
  }

  increment(): void {
    this.current++;
    this.render();
  }

  private render(): void {
    const percentage = Math.floor((this.current / this.total) * 100);
    const filled = Math.floor(percentage / 2);
    const empty = 50 - filled;
    
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    const elapsed = Date.now() - this.startTime;
    const rate = this.current / (elapsed / 1000);
    const remaining = this.total - this.current;
    const eta = remaining / rate;
    
    const etaFormatted = this.formatTime(eta);
    
    process.stdout.write(
      `\r${this.label}: [${bar}] ${percentage}% (${this.current}/${this.total}) ETA: ${etaFormatted}`
    );
    
    if (this.current >= this.total) {
      process.stdout.write('\n');
    }
  }

  private formatTime(seconds: number): string {
    if (!isFinite(seconds)) return '--:--';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  complete(): void {
    this.update(this.total);
  }
}
