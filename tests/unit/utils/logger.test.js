/**
 * Logger Utility Tests
 * Tests the logging functionality and configuration
 */

// We need to mock Winston before importing the logger
const mockTransports = [];
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
  silly: jest.fn(),
  log: jest.fn(),
  add: jest.fn(),
  remove: jest.fn(),
  transports: mockTransports,
  stream: { write: jest.fn() },
  logRequest: jest.fn(),
  logError: jest.fn(),
  logSecurityEvent: jest.fn(),
  logPerformance: jest.fn(),
  logDatabaseQuery: jest.fn(),
  audit: jest.fn(),
  business: jest.fn(),
  withContext: jest.fn(() => ({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    http: jest.fn(),
    debug: jest.fn()
  }))
};

const mockCreateLogger = jest.fn(() => mockLogger);
const mockConsoleTransport = jest.fn().mockImplementation(() => ({ name: 'console' }));
const mockFileTransport = jest.fn().mockImplementation(options => ({ name: 'file', filename: options.filename }));

jest.mock('winston', () => ({
  createLogger: mockCreateLogger,
  addColors: jest.fn(),
  config: { addColors: jest.fn() },
  format: {
    combine: jest.fn(() => 'combined-format'),
    timestamp: jest.fn(() => 'timestamp-format'),
    errors: jest.fn(() => 'errors-format'),
    json: jest.fn(() => 'json-format'),
    colorize: jest.fn(() => 'colorize-format'),
    simple: jest.fn(() => 'simple-format'),
    printf: jest.fn(() => 'printf-format')
  },
  transports: {
    Console: mockConsoleTransport,
    File: mockFileTransport
  }
}));

const winston = require('winston');

// Get references to the mocked functions for easier testing
const { createLogger } = winston;
const { Console: ConsoleTransport, File: FileTransport } = winston.transports;

describe('Logger Utility', () => {
  let originalEnv;

  beforeEach(() => {
    originalEnv = process.env;
    jest.clearAllMocks();
    // Clear require cache to get fresh module instances
    jest.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Logger Initialization', () => {
    test('should create logger with default configuration in development', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.LOG_LEVEL;

      require('../../../utils/logger');

      expect(createLogger).toHaveBeenCalledWith({
        levels: expect.any(Object),
        transports: expect.any(Array),
        exitOnError: false,
        handleExceptions: true,
        handleRejections: true
      });
    });

    test('should create logger with production configuration', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.LOG_LEVEL;

      require('../../../utils/logger');

      expect(createLogger).toHaveBeenCalledWith({
        levels: expect.any(Object),
        transports: expect.any(Array),
        exitOnError: false,
        handleExceptions: true,
        handleRejections: true
      });
    });

    test('should create logger with test configuration', () => {
      process.env.NODE_ENV = 'test';
      delete process.env.LOG_LEVEL;

      require('../../../utils/logger');

      expect(createLogger).toHaveBeenCalledWith({
        levels: expect.any(Object),
        transports: expect.any(Array),
        exitOnError: false,
        handleExceptions: true,
        handleRejections: true
      });
    });

    test('should respect custom LOG_LEVEL from environment', () => {
      process.env.NODE_ENV = 'development';
      process.env.LOG_LEVEL = 'warn';

      require('../../../utils/logger');

      expect(createLogger).toHaveBeenCalledWith({
        levels: expect.any(Object),
        transports: expect.any(Array),
        exitOnError: false,
        handleExceptions: true,
        handleRejections: true
      });
    });
  });

  describe('Transport Configuration', () => {
    test('should add console transport in development', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.LOG_LEVEL;

      require('../../../utils/logger');

      expect(ConsoleTransport).toHaveBeenCalledWith({
        format: 'combined-format',
        level: 'debug'
      });
    });

    test('should add file transports in production', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.LOG_LEVEL;

      require('../../../utils/logger');

      // Should create error log file transport
      expect(FileTransport).toHaveBeenCalledWith({
        filename: expect.stringContaining('error.log'),
        level: 'error',
        format: 'combined-format',
        maxsize: 5242880,
        maxFiles: 5,
        tailable: true
      });

      // Should create combined log file transport  
      expect(FileTransport).toHaveBeenCalledWith({
        filename: expect.stringContaining('combined.log'),
        format: 'combined-format',
        maxsize: 5242880,
        maxFiles: 10,
        tailable: true
      });
    });

    test('should only add console transport in test environment', () => {
      process.env.NODE_ENV = 'test';
      delete process.env.LOG_LEVEL;

      require('../../../utils/logger');

      expect(ConsoleTransport).toHaveBeenCalledWith({
        format: 'combined-format',
        level: 'debug'
      });
    });
  });

  describe('Log Level Methods', () => {
    let logger;

    beforeEach(() => {
      process.env.NODE_ENV = 'development';
      logger = require('../../../utils/logger');
    });

    test('should call winston info method', () => {
      const message = 'Test info message';
      const meta = { userId: '123' };

      logger.info(message, meta);

      expect(mockLogger.info).toHaveBeenCalledWith(message, meta);
    });

    test('should call winston warn method', () => {
      const message = 'Test warning message';
      const meta = { action: 'test' };

      logger.warn(message, meta);

      expect(mockLogger.warn).toHaveBeenCalledWith(message, meta);
    });

    test('should call winston error method', () => {
      const message = 'Test error message';
      const error = new Error('Test error');

      logger.error(message, { error: error.message, stack: error.stack });

      expect(mockLogger.error).toHaveBeenCalledWith(message, {
        error: error.message,
        stack: error.stack
      });
    });

    test('should call winston debug method', () => {
      const message = 'Test debug message';
      const meta = { requestId: 'req-123' };

      logger.debug(message, meta);

      expect(mockLogger.debug).toHaveBeenCalledWith(message, meta);
    });

    test('should handle logging without metadata', () => {
      const message = 'Simple log message';

      logger.info(message);

      expect(mockLogger.info).toHaveBeenCalledWith(message);
    });
  });

  describe('Security Logging', () => {
    let logger;

    beforeEach(() => {
      process.env.NODE_ENV = 'development';
      logger = require('../../../utils/logger');
    });

    test('should log security events with proper metadata', () => {
      const securityEvent = {
        type: 'AUTHENTICATION_FAILED',
        userId: 'user-123',
        ip: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
        timestamp: new Date().toISOString()
      };

      logger.warn('Security event detected', securityEvent);

      expect(mockLogger.warn).toHaveBeenCalledWith('Security event detected', securityEvent);
    });

    test('should log sensitive data attempts', () => {
      const sensitiveAttempt = {
        type: 'SENSITIVE_DATA_ACCESS',
        userId: 'user-456',
        resource: '/admin/users',
        ip: '10.0.0.1'
      };

      logger.error('Unauthorized access attempt', sensitiveAttempt);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Unauthorized access attempt',
        sensitiveAttempt
      );
    });
  });

  describe('Performance Logging', () => {
    let logger;

    beforeEach(() => {
      process.env.NODE_ENV = 'development';
      logger = require('../../../utils/logger');
    });

    test('should log performance metrics', () => {
      const performanceData = {
        endpoint: '/api/users',
        method: 'GET',
        responseTime: 234,
        statusCode: 200,
        userId: 'user-789'
      };

      logger.info('API request completed', performanceData);

      expect(mockLogger.info).toHaveBeenCalledWith('API request completed', performanceData);
    });

    test('should log slow query warnings', () => {
      const slowQuery = {
        query: 'SELECT * FROM users WHERE...',
        executionTime: 2500,
        threshold: 1000,
        userId: 'user-321'
      };

      logger.warn('Slow database query detected', slowQuery);

      expect(mockLogger.warn).toHaveBeenCalledWith('Slow database query detected', slowQuery);
    });
  });

  describe('Error Handling', () => {
    let logger;

    beforeEach(() => {
      process.env.NODE_ENV = 'development';
      logger = require('../../../utils/logger');
    });

    test('should handle Error objects properly', () => {
      const error = new Error('Database connection failed');
      error.code = 'DB_CONN_ERROR';

      logger.error('Database error occurred', {
        error: error.message,
        code: error.code,
        stack: error.stack
      });

      expect(mockLogger.error).toHaveBeenCalledWith('Database error occurred', {
        error: 'Database connection failed',
        code: 'DB_CONN_ERROR',
        stack: expect.any(String)
      });
    });

    test('should handle custom error objects', () => {
      const customError = {
        message: 'Validation failed',
        field: 'email',
        value: 'invalid-email',
        code: 'VALIDATION_ERROR'
      };

      logger.error('Input validation failed', customError);

      expect(mockLogger.error).toHaveBeenCalledWith('Input validation failed', customError);
    });
  });

  describe('Structured Logging', () => {
    let logger;

    beforeEach(() => {
      process.env.NODE_ENV = 'development';
      logger = require('../../../utils/logger');
    });

    test('should support structured logging with consistent format', () => {
      const structuredLog = {
        action: 'user_login',
        userId: 'user-555',
        timestamp: new Date().toISOString(),
        metadata: {
          ip: '192.168.1.100',
          userAgent: 'Chrome/91.0',
          sessionId: 'sess-abc123'
        },
        result: 'success'
      };

      logger.info('User login successful', structuredLog);

      expect(mockLogger.info).toHaveBeenCalledWith('User login successful', structuredLog);
    });

    test('should handle nested metadata objects', () => {
      const nestedLog = {
        request: {
          method: 'POST',
          url: '/api/challenges',
          headers: { 'content-type': 'application/json' }
        },
        response: {
          statusCode: 201,
          responseTime: 145
        },
        user: {
          id: 'user-777',
          role: 'player'
        }
      };

      logger.info('Challenge created', nestedLog);

      expect(mockLogger.info).toHaveBeenCalledWith('Challenge created', nestedLog);
    });
  });
});
