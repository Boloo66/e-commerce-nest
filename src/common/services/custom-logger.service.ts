import { Injectable, Logger, LoggerService } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class CustomLoggerService implements LoggerService {
  logger = new Logger(CustomLoggerService.name);

  private logsDir = path.join(process.cwd(), 'logs');

  constructor() {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  log(message: string, context?: string) {
    this.writeLog('LOG', message, context);
    this.logger.log(message, context);
  }

  error(message: string, trace?: string, context?: string) {
    this.writeLog('ERROR', message, context, trace);
    this.logger.error(message, trace, context);
  }

  warn(message: string, context?: string) {
    this.writeLog('WARN', message, context);
    this.logger.warn(message, context);
  }

  debug(message: string, context?: string) {
    this.writeLog('DEBUG', message, context);
    this.logger.debug(message, context);
  }

  private writeLog(
    level: string,
    message: string,
    context?: string,
    trace?: string,
  ) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${context ? `[${context}]` : ''} ${message} ${trace ? `\n${trace}` : ''}\n`;

    const logFile = path.join(this.logsDir, 'app.log');
    fs.appendFileSync(logFile, logMessage);

    if (level === 'ERROR') {
      const errorLogFile = path.join(this.logsDir, 'error.log');
      fs.appendFileSync(errorLogFile, logMessage);
    }

    if (context === 'HTTP') {
      const httpLogFile = path.join(this.logsDir, 'http.log');
      fs.appendFileSync(httpLogFile, logMessage);
    }
  }
}
