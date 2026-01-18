import * as fs from 'fs';
import * as path from 'path';

export class OmniLogger {
  private static logPath = path.join(process.cwd(), 'Omni', 'api_errors.log');
  private static MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB

  private static ensureDirectoryExists() {
    const dir = path.dirname(this.logPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private static rotateLogsIfNeeded() {
    try {
      if (fs.existsSync(this.logPath)) {
        const stats = fs.statSync(this.logPath);
        if (stats.size > this.MAX_LOG_SIZE) {
          const timestamp = new Date()
            .toISOString()
            .replace(/[:.]/g, '-')
            .slice(0, 19);
          const rotatedPath = path.join(
            path.dirname(this.logPath),
            `api_errors_${timestamp}.log`,
          );
          fs.renameSync(this.logPath, rotatedPath);
        }
      }
    } catch (err) {
      console.error('Failed to rotate Omni logs:', err);
    }
  }

  static log(message: string, data?: any) {
    this.ensureDirectoryExists();
    this.rotateLogsIfNeeded();

    const timestamp = new Date().toISOString();
    let logMessage = `[${timestamp}] ${message}\n`;
    if (data) {
      logMessage += `Data: ${JSON.stringify(data, null, 2)}\n`;
    }
    logMessage += '-------------------------------------------\n';

    try {
      fs.appendFileSync(this.logPath, logMessage);
    } catch (err) {
      console.error('Failed to write to Omni log:', err);
    }
  }

  static logError(error: any, context?: string) {
    this.ensureDirectoryExists();
    this.rotateLogsIfNeeded();

    const timestamp = new Date().toISOString();
    let logMessage = `[${timestamp}] ERROR: ${context || 'General Error'}\n`;
    logMessage += `Message: ${error.message || error}\n`;
    if (error.stack) {
      logMessage += `Stack: ${error.stack}\n`;
    }
    if (error.response) {
      logMessage += `Response: ${JSON.stringify(error.response, null, 2)}\n`;
    }
    logMessage += '-------------------------------------------\n';

    try {
      fs.appendFileSync(this.logPath, logMessage);
    } catch (err) {
      console.error('Failed to write to Omni log error:', err);
    }
  }
}