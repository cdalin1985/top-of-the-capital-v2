/**
 * Centralized Error Handling Middleware
 * Provides consistent error responses and proper logging
 */

const logger = require('../utils/logger');

class ErrorHandler {
  /**
   * Main error handling middleware
   */
  static handle(error, req, res, _next) {
    // Log the error with context
    logger.logError(error, {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.userId || null,
      requestId: req.requestId || null
    });

    // Determine error type and response
    const errorResponse = ErrorHandler.categorizeError(error, req);

    // Send consistent error response
    res.status(errorResponse.status).json({
      success: false,
      error: errorResponse.message,
      code: errorResponse.code,
      ...(process.env.NODE_ENV === 'development' && {
        stack: error.stack,
        details: errorResponse.details
      })
    });
  }

  /**
   * Helper to check for validation errors
   */
  static _handleValidationError(error) {
    if (error.name === 'ValidationError' || error.code === 'VALIDATION_ERROR') {
      return {
        status: 400,
        message: error.message || 'Invalid input data',
        code: 'VALIDATION_ERROR',
        details: error.details || null
      };
    }
    return null;
  }

  /**
   * Helper to check for authentication/authorization errors
   */
  static _handleAuthErrors(error) {
    if (error.name === 'UnauthorizedError' || error.code === 'AUTH_FAILED') {
      return {
        status: 401,
        message: 'Authentication required',
        code: 'AUTHENTICATION_REQUIRED',
        details: null
      };
    }

    if (error.name === 'ForbiddenError' || error.code === 'FORBIDDEN') {
      return {
        status: 403,
        message: 'Access denied',
        code: 'ACCESS_DENIED',
        details: null
      };
    }

    return null;
  }

  /**
   * Helper to check for not found errors
   */
  static _handleNotFoundError(error) {
    if (error.name === 'NotFoundError' || error.code === 'NOT_FOUND') {
      return {
        status: 404,
        message: error.message || 'Resource not found',
        code: 'NOT_FOUND',
        details: null
      };
    }
    return null;
  }

  /**
   * Helper to check for rate limiting errors
   */
  static _handleRateLimitError(error) {
    if (error.name === 'TooManyRequestsError' || error.code === 'RATE_LIMITED') {
      return {
        status: 429,
        message: 'Too many requests',
        code: 'RATE_LIMITED',
        details: { retryAfter: error.retryAfter || 60 }
      };
    }
    return null;
  }

  /**
   * Helper to check for file upload errors
   */
  static _handleFileUploadErrors(error) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return {
        status: 413,
        message: 'File too large',
        code: 'FILE_TOO_LARGE',
        details: { maxSize: error.limit }
      };
    }

    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return {
        status: 400,
        message: 'Invalid file upload',
        code: 'INVALID_FILE_UPLOAD',
        details: null
      };
    }

    return null;
  }

  /**
   * Helper to check for JSON parsing errors
   */
  static _handleJsonError(error) {
    if (error.type === 'entity.parse.failed') {
      return {
        status: 400,
        message: 'Invalid JSON in request body',
        code: 'INVALID_JSON',
        details: null
      };
    }
    return null;
  }

  /**
   * Helper to return default server error
   */
  static _getDefaultError(error) {
    return {
      status: 500,
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
      code: 'INTERNAL_SERVER_ERROR',
      details: null
    };
  }

  /**
   * Categorize errors and determine appropriate response
   */
  static categorizeError(error, _req) {
    // Database errors (check first as they have specific handling)
    if (error.name === 'PrismaClientKnownRequestError') {
      return ErrorHandler.handlePrismaError(error);
    }

    // Try each error type handler
    const handlers = [
      this._handleValidationError,
      this._handleAuthErrors,
      this._handleNotFoundError,
      this._handleRateLimitError,
      this._handleFileUploadErrors,
      this._handleJsonError
    ];

    for (const handler of handlers) {
      const result = handler(error);
      if (result) {
        return result;
      }
    }

    // Default to server error if no specific handler matched
    return this._getDefaultError(error);
  }

  /**
   * Handle Prisma-specific database errors
   */
  static handlePrismaError(error) {
    switch (error.code) {
      case 'P2002': // Unique constraint violation
        return {
          status: 409,
          message: 'Resource already exists',
          code: 'DUPLICATE_ENTRY',
          details: { field: error.meta?.target?.[0] || 'unknown' }
        };

      case 'P2025': // Record not found
        return {
          status: 404,
          message: 'Record not found',
          code: 'RECORD_NOT_FOUND',
          details: null
        };

      case 'P2003': // Foreign key constraint violation
        return {
          status: 400,
          message: 'Invalid reference to related resource',
          code: 'INVALID_REFERENCE',
          details: null
        };

      case 'P2014': // Invalid ID
        return {
          status: 400,
          message: 'Invalid ID format',
          code: 'INVALID_ID',
          details: null
        };

      default:
        return {
          status: 500,
          message: 'Database operation failed',
          code: 'DATABASE_ERROR',
          details: null
        };
    }
  }

  /**
   * Async error wrapper for route handlers
   */
  static asyncWrapper(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  /**
   * 404 handler for unmatched routes
   */
  static notFound(req, res, next) {
    const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
    error.name = 'NotFoundError';
    error.code = 'NOT_FOUND';
    next(error);
  }

  /**
   * Request ID middleware for tracking
   */
  static requestId(req, res, next) {
    req.requestId = ErrorHandler.generateRequestId();
    res.set('X-Request-ID', req.requestId);
    next();
  }

  /**
   * Generate unique request ID
   */
  static generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Custom error classes for better error categorization
 */
class ValidationError extends Error {
  constructor(message, details = null) {
    super(message);
    this.name = 'ValidationError';
    this.code = 'VALIDATION_ERROR';
    this.details = details;
  }
}

class NotFoundError extends Error {
  constructor(message = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
    this.code = 'NOT_FOUND';
  }
}

class UnauthorizedError extends Error {
  constructor(message = 'Authentication required') {
    super(message);
    this.name = 'UnauthorizedError';
    this.code = 'AUTH_FAILED';
  }
}

class ForbiddenError extends Error {
  constructor(message = 'Access denied') {
    super(message);
    this.name = 'ForbiddenError';
    this.code = 'FORBIDDEN';
  }
}

class TooManyRequestsError extends Error {
  constructor(message = 'Too many requests', retryAfter = 60) {
    super(message);
    this.name = 'TooManyRequestsError';
    this.code = 'RATE_LIMITED';
    this.retryAfter = retryAfter;
  }
}

module.exports = {
  ErrorHandler,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  TooManyRequestsError
};
