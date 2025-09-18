/**
 * Error Handler Middleware Tests
 * Tests centralized error handling and response formatting
 */

// Mock logger first - before requiring other modules
const mockLogger = {
  logError: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn()
};

jest.mock('../../../utils/logger', () => mockLogger);

// Now require modules after mocking
const {
  ErrorHandler,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  TooManyRequestsError
} = require('../../../middleware/error-handler');
const testUtils = require('../../test-utils');

describe('ErrorHandler Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = testUtils.createMockReq();
    res = testUtils.createMockRes();
    next = jest.fn();

    // Add requestId to req
    req.requestId = 'test-request-123';

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('handle', () => {
    test('should handle validation errors', () => {
      const error = new ValidationError('Invalid input', ['Email is required']);
      process.env.NODE_ENV = 'test';

      ErrorHandler.handle(error, req, res, next);

      expect(mockLogger.logError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          method: req.method,
          url: req.originalUrl,
          userId: null,
          requestId: 'test-request-123'
        })
      );

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid input',
        code: 'VALIDATION_ERROR'
      });
    });

    test('should handle unauthorized errors', () => {
      const error = new UnauthorizedError('Token expired');

      ErrorHandler.handle(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required',
        code: 'AUTHENTICATION_REQUIRED'
      });
    });

    test('should handle forbidden errors', () => {
      const error = new ForbiddenError('Admin access required');

      ErrorHandler.handle(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Access denied',
        code: 'ACCESS_DENIED'
      });
    });

    test('should handle not found errors', () => {
      const error = new NotFoundError('User not found');

      ErrorHandler.handle(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'User not found',
        code: 'NOT_FOUND'
      });
    });

    test('should handle rate limit errors', () => {
      const error = new TooManyRequestsError('Rate limit exceeded', 120);

      ErrorHandler.handle(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Too many requests',
        code: 'RATE_LIMITED'
      });
    });

    test('should handle JSON parsing errors', () => {
      const error = new Error('Unexpected token');
      error.type = 'entity.parse.failed';

      ErrorHandler.handle(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid JSON in request body',
        code: 'INVALID_JSON'
      });
    });

    test('should handle generic errors in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const error = new Error('Internal database connection failed');

      ErrorHandler.handle(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      });

      process.env.NODE_ENV = originalEnv;
    });

    test('should include stack trace in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const error = new Error('Test error');

      ErrorHandler.handle(error, req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Test error',
          code: 'INTERNAL_SERVER_ERROR',
          stack: expect.any(String)
        })
      );

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('handlePrismaError', () => {
    test('should handle unique constraint violations', () => {
      const error = {
        name: 'PrismaClientKnownRequestError',
        code: 'P2002',
        meta: { target: ['email'] }
      };

      const result = ErrorHandler.categorizeError(error, req);

      expect(result).toEqual({
        status: 409,
        message: 'Resource already exists',
        code: 'DUPLICATE_ENTRY',
        details: { field: 'email' }
      });
    });

    test('should handle record not found errors', () => {
      const error = {
        name: 'PrismaClientKnownRequestError',
        code: 'P2025'
      };

      const result = ErrorHandler.categorizeError(error, req);

      expect(result).toEqual({
        status: 404,
        message: 'Record not found',
        code: 'RECORD_NOT_FOUND',
        details: null
      });
    });

    test('should handle foreign key constraint violations', () => {
      const error = {
        name: 'PrismaClientKnownRequestError',
        code: 'P2003'
      };

      const result = ErrorHandler.categorizeError(error, req);

      expect(result).toEqual({
        status: 400,
        message: 'Invalid reference to related resource',
        code: 'INVALID_REFERENCE',
        details: null
      });
    });

    test('should handle invalid ID errors', () => {
      const error = {
        name: 'PrismaClientKnownRequestError',
        code: 'P2014'
      };

      const result = ErrorHandler.categorizeError(error, req);

      expect(result).toEqual({
        status: 400,
        message: 'Invalid ID format',
        code: 'INVALID_ID',
        details: null
      });
    });
  });

  describe('asyncWrapper', () => {
    test('should catch async errors and pass to next', async () => {
      const asyncHandler = async (req, res, next) => {
        throw new Error('Async error');
      };

      const wrappedHandler = ErrorHandler.asyncWrapper(asyncHandler);
      await wrappedHandler(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

    test('should call next normally for successful async handlers', async () => {
      const asyncHandler = async (req, res, next) => {
        res.status(200).json({ success: true });
      };

      const wrappedHandler = ErrorHandler.asyncWrapper(asyncHandler);
      await wrappedHandler(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true });
    });
  });

  describe('notFound', () => {
    test('should create and pass not found error', () => {
      req.method = 'GET';
      req.originalUrl = '/api/nonexistent';

      ErrorHandler.notFound(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Route not found: GET /api/nonexistent',
          name: 'NotFoundError',
          code: 'NOT_FOUND'
        })
      );
    });
  });

  describe('requestId', () => {
    test('should generate and set request ID', () => {
      ErrorHandler.requestId(req, res, next);

      expect(req.requestId).toBeDefined();
      expect(req.requestId).toMatch(/^req_\d+_[a-z0-9]+$/);
      expect(res.set).toHaveBeenCalledWith('X-Request-ID', req.requestId);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('generateRequestId', () => {
    test('should generate unique request IDs', () => {
      const id1 = ErrorHandler.generateRequestId();
      const id2 = ErrorHandler.generateRequestId();

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^req_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^req_\d+_[a-z0-9]+$/);
    });
  });
});

describe('Custom Error Classes', () => {
  describe('ValidationError', () => {
    test('should create validation error with details', () => {
      const error = new ValidationError('Validation failed', ['Email is required']);

      expect(error.message).toBe('Validation failed');
      expect(error.name).toBe('ValidationError');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.details).toEqual(['Email is required']);
    });

    test('should create validation error without details', () => {
      const error = new ValidationError('Validation failed');

      expect(error.details).toBeNull();
    });
  });

  describe('NotFoundError', () => {
    test('should create not found error with custom message', () => {
      const error = new NotFoundError('User not found');

      expect(error.message).toBe('User not found');
      expect(error.name).toBe('NotFoundError');
      expect(error.code).toBe('NOT_FOUND');
    });

    test('should create not found error with default message', () => {
      const error = new NotFoundError();

      expect(error.message).toBe('Resource not found');
    });
  });

  describe('UnauthorizedError', () => {
    test('should create unauthorized error with custom message', () => {
      const error = new UnauthorizedError('Token expired');

      expect(error.message).toBe('Token expired');
      expect(error.name).toBe('UnauthorizedError');
      expect(error.code).toBe('AUTH_FAILED');
    });

    test('should create unauthorized error with default message', () => {
      const error = new UnauthorizedError();

      expect(error.message).toBe('Authentication required');
    });
  });

  describe('ForbiddenError', () => {
    test('should create forbidden error with custom message', () => {
      const error = new ForbiddenError('Admin access required');

      expect(error.message).toBe('Admin access required');
      expect(error.name).toBe('ForbiddenError');
      expect(error.code).toBe('FORBIDDEN');
    });

    test('should create forbidden error with default message', () => {
      const error = new ForbiddenError();

      expect(error.message).toBe('Access denied');
    });
  });

  describe('TooManyRequestsError', () => {
    test('should create rate limit error with custom retry time', () => {
      const error = new TooManyRequestsError('Rate limit exceeded', 300);

      expect(error.message).toBe('Rate limit exceeded');
      expect(error.name).toBe('TooManyRequestsError');
      expect(error.code).toBe('RATE_LIMITED');
      expect(error.retryAfter).toBe(300);
    });

    test('should create rate limit error with defaults', () => {
      const error = new TooManyRequestsError();

      expect(error.message).toBe('Too many requests');
      expect(error.retryAfter).toBe(60);
    });
  });
});
