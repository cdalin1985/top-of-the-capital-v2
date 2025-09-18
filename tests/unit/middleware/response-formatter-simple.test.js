/**
 * Response Formatter Middleware Tests (Simplified)
 * Tests basic functionality of response formatting middleware
 */

// Mock the ValidationMiddleware dependency
const mockValidationMiddleware = {
  sanitizeUser: jest.fn(user =>
    user
      ? {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          isActive: user.isActive,
          isAdmin: user.isAdmin
        }
      : null
  ),
  sanitizeUsers: jest.fn(users =>
    users
      ? users.map(user => ({
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          isActive: user.isActive,
          isAdmin: user.isAdmin
        }))
      : []
  )
};

jest.mock('../../../middleware/validation', () => mockValidationMiddleware);

const ResponseFormatter = require('../../../middleware/response-formatter');
const testUtils = require('../../test-utils');

describe('Response Formatter Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = testUtils.createMockReq();
    res = testUtils.createMockRes();
    next = jest.fn();

    // Mock the req reference in res for requestId
    res.req = req;
    req.requestId = 'test-request-123';

    // Setup response formatter middleware
    ResponseFormatter.middleware(req, res, next);

    jest.clearAllMocks();
  });

  describe('middleware setup', () => {
    test('should add formatter methods to response object', () => {
      expect(res.success).toBeDefined();
      expect(res.paginated).toBeDefined();
      expect(res.created).toBeDefined();
      expect(res.updated).toBeDefined();
      expect(res.deleted).toBeDefined();
      expect(res.user).toBeDefined();
      expect(res.auth).toBeDefined();
      expect(typeof res.success).toBe('function');
    });

    test('should call next to continue middleware chain', () => {
      ResponseFormatter.middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('success method', () => {
    test('should format success response with data and message', () => {
      const data = { id: 1, name: 'Test' };

      res.success(data, 'Operation successful', 201);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Operation successful',
        data: data,
        timestamp: expect.any(String),
        requestId: 'test-request-123'
      });
    });

    test('should format success response with null data', () => {
      res.success(null);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        timestamp: expect.any(String),
        requestId: 'test-request-123'
      });
    });
  });

  describe('created method', () => {
    test('should format created response', () => {
      const data = { id: 1, name: 'Test Resource' };

      res.created(data);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Resource created successfully',
        data: data,
        timestamp: expect.any(String),
        requestId: 'test-request-123'
      });
    });
  });

  describe('paginated method', () => {
    test('should format paginated response', () => {
      const data = [{ id: 1 }, { id: 2 }];
      const pagination = {
        page: 1,
        limit: 10,
        total: 25
      };

      res.paginated(data, pagination);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        timestamp: expect.any(String),
        requestId: 'test-request-123',
        data: data,
        pagination: {
          page: 1,
          limit: 10,
          total: 25,
          pages: 3,
          hasNext: true,
          hasPrev: false
        }
      });
    });
  });

  describe('user method', () => {
    test('should format user response with sanitization', () => {
      const user = {
        id: 'user123',
        email: 'test@example.com',
        displayName: 'Test User',
        password: 'secret' // Should be filtered by sanitization
      };

      res.user(user, 'User retrieved');

      expect(mockValidationMiddleware.sanitizeUser).toHaveBeenCalledWith(user);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'User retrieved',
        data: {
          id: 'user123',
          email: 'test@example.com',
          displayName: 'Test User'
        },
        timestamp: expect.any(String),
        requestId: 'test-request-123'
      });
    });
  });

  describe('auth method', () => {
    test('should format auth response with token and user', () => {
      const user = { id: 'user123', email: 'test@example.com' };
      const token = 'jwt.token.here';

      res.auth(user, token);

      expect(mockValidationMiddleware.sanitizeUser).toHaveBeenCalledWith(user);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Authentication successful',
        data: {
          user: { id: 'user123', email: 'test@example.com' },
          token: token,
          expiresIn: process.env.JWT_EXPIRES_IN || '7d'
        },
        timestamp: expect.any(String),
        requestId: 'test-request-123'
      });
    });
  });

  describe('static methods', () => {
    test('should call static success method directly', () => {
      const data = { test: 'data' };

      ResponseFormatter.success(res, data, 'Test message', 200);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Test message',
        data: data,
        timestamp: expect.any(String),
        requestId: 'test-request-123'
      });
    });
  });
});
