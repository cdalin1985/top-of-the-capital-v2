/**
 * Response Formatting Middleware
 * Provides consistent API response structure
 */

const ValidationMiddleware = require('./validation');

class ResponseFormatter {
  /**
   * Success response helper
   */
  static success(res, data = null, message = null, status = 200) {
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      requestId: res.req.requestId
    };

    if (message) {
      response.message = message;
    }
    if (data !== null) {
      response.data = data;
    }

    return res.status(status).json(response);
  }

  /**
   * Paginated response helper
   */
  static paginated(res, data, pagination, status = 200) {
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      requestId: res.req.requestId,
      data: data,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        pages: Math.ceil(pagination.total / pagination.limit),
        hasNext: pagination.page < Math.ceil(pagination.total / pagination.limit),
        hasPrev: pagination.page > 1
      }
    };

    return res.status(status).json(response);
  }

  /**
   * Created resource response
   */
  static created(res, data, message = 'Resource created successfully') {
    return ResponseFormatter.success(res, data, message, 201);
  }

  /**
   * Updated resource response
   */
  static updated(res, data, message = 'Resource updated successfully') {
    return ResponseFormatter.success(res, data, message, 200);
  }

  /**
   * Deleted resource response
   */
  static deleted(res, message = 'Resource deleted successfully') {
    return ResponseFormatter.success(res, null, message, 200);
  }

  /**
   * User response with sanitization
   */
  static user(res, user, message = null, status = 200) {
    const sanitizedUser = ValidationMiddleware.sanitizeUser(user);
    return ResponseFormatter.success(res, sanitizedUser, message, status);
  }

  /**
   * Users list response with sanitization
   */
  static users(res, users, message = null, status = 200) {
    const sanitizedUsers = ValidationMiddleware.sanitizeUsers(users);
    return ResponseFormatter.success(res, sanitizedUsers, message, status);
  }

  /**
   * Paginated users response
   */
  static usersPaginated(res, users, pagination, message = null) {
    const sanitizedUsers = ValidationMiddleware.sanitizeUsers(users);
    return ResponseFormatter.paginated(res, sanitizedUsers, pagination);
  }

  /**
   * Authentication response with token
   */
  static auth(res, user, token, message = 'Authentication successful') {
    const sanitizedUser = ValidationMiddleware.sanitizeUser(user);
    return ResponseFormatter.success(
      res,
      {
        user: sanitizedUser,
        token: token,
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
      },
      message,
      200
    );
  }

  /**
   * Analytics response
   */
  static analytics(res, data, message = null) {
    return ResponseFormatter.success(
      res,
      {
        analytics: data,
        generatedAt: new Date().toISOString()
      },
      message,
      200
    );
  }

  /**
   * File upload response
   */
  static fileUpload(res, fileInfo, message = 'File uploaded successfully') {
    return ResponseFormatter.success(
      res,
      {
        filename: fileInfo.filename,
        originalName: fileInfo.originalname,
        size: fileInfo.size,
        mimeType: fileInfo.mimetype,
        url: fileInfo.url || `/uploads/${fileInfo.filename}`
      },
      message,
      201
    );
  }

  /**
   * Health check response
   */
  static health(res, checks = {}) {
    const status = Object.values(checks).every(check => check.status === 'healthy')
      ? 'healthy'
      : 'unhealthy';

    return res.status(status === 'healthy' ? 200 : 503).json({
      success: status === 'healthy',
      status: status,
      timestamp: new Date().toISOString(),
      checks: checks
    });
  }

  /**
   * Middleware to add response helpers to res object
   */
  static middleware(req, res, next) {
    // Add success response methods
    res.success = (data, message, status) => ResponseFormatter.success(res, data, message, status);
    res.paginated = (data, pagination, status) =>
      ResponseFormatter.paginated(res, data, pagination, status);
    res.created = (data, message) => ResponseFormatter.created(res, data, message);
    res.updated = (data, message) => ResponseFormatter.updated(res, data, message);
    res.deleted = message => ResponseFormatter.deleted(res, message);

    // Add specialized response methods
    res.user = (user, message, status) => ResponseFormatter.user(res, user, message, status);
    res.users = (users, message, status) => ResponseFormatter.users(res, users, message, status);
    res.usersPaginated = (users, pagination) =>
      ResponseFormatter.usersPaginated(res, users, pagination);
    res.auth = (user, token, message) => ResponseFormatter.auth(res, user, token, message);
    res.analytics = (data, message) => ResponseFormatter.analytics(res, data, message);
    res.fileUpload = (fileInfo, message) => ResponseFormatter.fileUpload(res, fileInfo, message);
    res.health = checks => ResponseFormatter.health(res, checks);

    next();
  }
}

module.exports = ResponseFormatter;
