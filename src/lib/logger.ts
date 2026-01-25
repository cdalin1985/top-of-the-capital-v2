/**
 * Logger utility for consistent logging across the app.
 * Logs are only output in development mode (__DEV__).
 * In production, this can be extended to send errors to a crash reporting service.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerOptions {
  context?: string;
}

/**
 * Create a logger with optional context prefix
 */
function createLogger(options?: LoggerOptions) {
  const prefix = options?.context ? `[${options.context}]` : '';

  const log = (level: LogLevel, message: string, ...args: unknown[]) => {
    if (!__DEV__) {
      // In production, you could send to crash reporting service here
      // e.g., Sentry.captureMessage(message, { level, extra: args });
      return;
    }

    const timestamp = new Date().toISOString();
    const formattedMessage = prefix ? `${prefix} ${message}` : message;

    switch (level) {
      case 'debug':
        // eslint-disable-next-line no-console
        console.debug(`[${timestamp}] DEBUG:`, formattedMessage, ...args);
        break;
      case 'info':
        // eslint-disable-next-line no-console
        console.info(`[${timestamp}] INFO:`, formattedMessage, ...args);
        break;
      case 'warn':
        // eslint-disable-next-line no-console
        console.warn(`[${timestamp}] WARN:`, formattedMessage, ...args);
        break;
      case 'error':
        // eslint-disable-next-line no-console
        console.error(`[${timestamp}] ERROR:`, formattedMessage, ...args);
        break;
    }
  };

  return {
    debug: (message: string, ...args: unknown[]) => log('debug', message, ...args),
    info: (message: string, ...args: unknown[]) => log('info', message, ...args),
    warn: (message: string, ...args: unknown[]) => log('warn', message, ...args),
    error: (message: string, ...args: unknown[]) => log('error', message, ...args),
  };
}

// Default logger instance
export const logger = createLogger();

// Factory to create contextual loggers
export { createLogger };
