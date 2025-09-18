/**
 * Centralized Logging Utility
 * Winston-based logger with structured logging
 */

const winston = require('winston');
const path = require('path');

// Define log levels and colors
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'cyan'
};

// Add colors to winston
if (winston.addColors) {
  winston.addColors(logColors);
} else if (winston.config && winston.config.addColors) {
  winston.config.addColors(logColors);
}

// Format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    const metaString = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    const stackString = stack ? `\n${stack}` : '';
    return `${timestamp} [${level}]: ${message}${stackString}${metaString ? `\n${metaString}` : ''}`;
  })
);

// Format for file output
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create logs directory
const logsDir = path.join(process.cwd(), 'logs');

// Transport configurations
const transports = [
  // Console transport (always enabled for development)
  new winston.transports.Console({
    format: consoleFormat,
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug')
  })
];

// File transports (only in production or when explicitly enabled)
if (process.env.NODE_ENV === 'production' || process.env.ENABLE_FILE_LOGGING === 'true') {
  // Error log file
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    })
  );

  // Combined log file
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 10,
      tailable: true
    })
  );

  // HTTP access log
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'access.log'),
      level: 'http',
      format: fileFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      tailable: true
    })
  );
}

// Create logger instance
const logger = winston.createLogger({
  levels: logLevels,
  transports,
  exitOnError: false,
  handleExceptions: true,
  handleRejections: true
});

// Create a stream for HTTP request logging (Morgan integration)
logger.stream = {
  write: message => {
    logger.http(message.trim());
  }
};

// Utility methods
logger.logRequest = (req, res, responseTime) => {
  const { method, originalUrl, ip } = req;
  const { statusCode } = res;
  const contentLength = res.get('Content-Length') || 0;

  logger.http('HTTP Request', {
    method,
    url: originalUrl,
    statusCode,
    contentLength: parseInt(contentLength, 10),
    responseTime: `${responseTime}ms`,
    ip,
    userAgent: req.get('User-Agent'),
    userId: req.userId || null
  });
};

logger.logError = (error, context = {}) => {
  logger.error(error.message || 'Unknown error', {
    stack: error.stack,
    name: error.name,
    code: error.code,
    ...context
  });
};

logger.logSecurityEvent = (event, details = {}) => {
  logger.warn(`Security Event: ${event}`, {
    event,
    timestamp: new Date().toISOString(),
    severity: 'security',
    ...details
  });
};

logger.logPerformance = (operation, duration, context = {}) => {
  const level = duration > 1000 ? 'warn' : 'debug';
  logger[level](`Performance: ${operation}`, {
    operation,
    duration: `${duration}ms`,
    slow: duration > 1000,
    ...context
  });
};

logger.logDatabaseQuery = (query, duration, context = {}) => {
  if (process.env.LOG_DB_QUERIES === 'true') {
    logger.debug('Database Query', {
      query,
      duration: `${duration}ms`,
      ...context
    });
  }
};

// Enhanced logging for different scenarios
logger.audit = (action, userId, details = {}) => {
  logger.info(`Audit: ${action}`, {
    action,
    userId,
    timestamp: new Date().toISOString(),
    type: 'audit',
    ...details
  });
};

logger.business = (event, data = {}) => {
  logger.info(`Business Event: ${event}`, {
    event,
    timestamp: new Date().toISOString(),
    type: 'business',
    ...data
  });
};

// Utility for request context
logger.withContext = context => {
  return {
    error: (message, meta = {}) => logger.error(message, { ...context, ...meta }),
    warn: (message, meta = {}) => logger.warn(message, { ...context, ...meta }),
    info: (message, meta = {}) => logger.info(message, { ...context, ...meta }),
    http: (message, meta = {}) => logger.http(message, { ...context, ...meta }),
    debug: (message, meta = {}) => logger.debug(message, { ...context, ...meta })
  };
};

// Handle uncaught exceptions
process.on('uncaughtException', error => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
});

module.exports = logger;
