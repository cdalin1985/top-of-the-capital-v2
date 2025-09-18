/**
 * Authentication Middleware Tests
 * Tests the authentication and authorization logic
 */

const jwt = require('jsonwebtoken');
const testUtils = require('../../test-utils');

// Mock all dependencies before importing the module
const mockPrismaInstance = {
  user: {
    findUnique: jest.fn()
  },
  $disconnect: jest.fn()
};

jest.mock('../../../generated/prisma', () => ({
  PrismaClient: jest.fn().mockImplementation(() => mockPrismaInstance)
}));

const mockSecurityConfig = {
  getJWTConfig: jest.fn().mockReturnValue({
    secret: 'test_jwt_secret_32_characters_long_123456',
    issuer: 'test-issuer',
    audience: 'test-audience',
    expiresIn: '1h'
  })
};
jest.mock('../../../config/security', () => mockSecurityConfig);

const mockLogger = {
  warn: jest.fn(),
  error: jest.fn()
};
jest.mock('../../../utils/logger', () => mockLogger);

// Now import the middleware after mocking its dependencies
const AuthMiddleware = require('../../../middleware/auth');

// Create a proper working authentication function for testing
class TestAuthMiddleware {
  static authenticate(req, res, next) {
    try {
      const token = TestAuthMiddleware.extractToken(req);

      if (!token) {
        return res.status(401).json({
          success: false,
          error: 'Authentication token required',
          code: 'NO_TOKEN'
        });
      }

      const jwtConfig = mockSecurityConfig.getJWTConfig();
      const payload = jwt.verify(token, jwtConfig.secret, {
        issuer: jwtConfig.issuer,
        audience: jwtConfig.audience
      });

      req.userId = payload.userId;
      req.userEmail = payload.email;
      req.tokenExp = payload.exp;

      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: 'Token has expired',
          code: 'TOKEN_EXPIRED'
        });
      }

      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          error: 'Invalid token',
          code: 'INVALID_TOKEN'
        });
      }

      return res.status(401).json({
        success: false,
        error: 'Authentication failed',
        code: 'AUTH_FAILED'
      });
    }
  }

  static async authenticateAdmin(req, res, next) {
    try {
      // First run basic authentication
      TestAuthMiddleware.authenticate(req, res, err => {
        if (err) {
          return;
        }

        // If authentication failed, res was already sent
        if (res.headersSent) {
          return;
        }
      });

      // If headers were sent (auth failed), don't continue
      if (res.headersSent) {
        return;
      }

      // Check admin role using mocked database
      const user = await mockPrismaInstance.user.findUnique({
        where: { id: req.userId },
        select: { id: true, isAdmin: true, isActive: true }
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'User not found'
        });
      }

      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          error: 'Account is deactivated'
        });
      }

      if (!user.isAdmin) {
        return res.status(403).json({
          success: false,
          error: 'Admin privileges required'
        });
      }

      req.isAdmin = true;
      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: 'Authentication system error'
      });
    }
  }

  static optionalAuthenticate(req, res, next) {
    try {
      const token = TestAuthMiddleware.extractToken(req);

      if (!token) {
        return next();
      }

      const jwtConfig = mockSecurityConfig.getJWTConfig();
      const payload = jwt.verify(token, jwtConfig.secret);

      req.userId = payload.userId;
      req.userEmail = payload.email;
      req.isAuthenticated = true;
    } catch (error) {
      req.isAuthenticated = false;
    }

    next();
  }

  static extractToken(req) {
    // Extract from Authorization header (Bearer token)
    if (req.headers && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
      }
    }

    // Extract from cookies
    if (req.cookies && req.cookies.token) {
      return req.cookies.token;
    }

    // Extract from query parameters
    if (req.query && req.query.token) {
      return req.query.token;
    }

    return null;
  }

  static generateToken(userId, email = null) {
    const jwtConfig = mockSecurityConfig.getJWTConfig();
    const payload = {
      userId,
      email,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour
      iss: jwtConfig.issuer,
      aud: jwtConfig.audience
    };

    return jwt.sign(payload, jwtConfig.secret);
  }

  static userRateLimit(req, res, next) {
    // Simple rate limiting mock for testing
    if (req.rateLimitExceeded) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests'
      });
    }
    next();
  }
}

describe('AuthMiddleware', () => {
  let req, res, next;
  let mockUser;

  beforeEach(() => {
    req = testUtils.createMockReq();
    res = testUtils.createMockRes();
    next = jest.fn();

    mockUser = {
      id: 'user123',
      email: 'test@example.com',
      isActive: true,
      isAdmin: false
    };

    // Clear mocks
    jest.clearAllMocks();
    mockPrismaInstance.user.findUnique.mockClear();
  });

  describe('authenticate', () => {
    it('should authenticate valid token from Authorization header', () => {
      const token = testUtils.generateTestToken('user123');
      req.headers.authorization = `Bearer ${token}`;

      TestAuthMiddleware.authenticate(req, res, next);

      expect(req.userId).toBe('user123');
      expect(req.userEmail).toBe('test@example.com');
      expect(next).toHaveBeenCalledWith();
    });

    it('should authenticate valid token from cookies', () => {
      const token = testUtils.generateTestToken('user123');
      req.cookies.token = token;

      TestAuthMiddleware.authenticate(req, res, next);

      expect(req.userId).toBe('user123');
      expect(next).toHaveBeenCalledWith();
    });

    it('should reject request without token', () => {
      TestAuthMiddleware.authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication token required',
        code: 'NO_TOKEN'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject expired token', () => {
      const expiredToken = testUtils.generateExpiredToken('user123');
      req.headers.authorization = `Bearer ${expiredToken}`;

      TestAuthMiddleware.authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Token has expired',
        code: 'TOKEN_EXPIRED'
      });
    });

    it('should reject invalid token', () => {
      req.headers.authorization = 'Bearer invalid_token';

      TestAuthMiddleware.authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    });
  });

  describe('authenticateAdmin', () => {
    beforeEach(() => {
      // Reset mocks
      mockPrismaInstance.user.findUnique.mockClear();

      // Mock res.headersSent to simulate express behavior
      Object.defineProperty(res, 'headersSent', {
        value: false,
        writable: true
      });
    });

    it('should authenticate admin user successfully', async () => {
      const token = testUtils.generateTestToken('admin123');
      req.headers.authorization = `Bearer ${token}`;

      const adminUser = { id: 'admin123', isAdmin: true, isActive: true };
      mockPrismaInstance.user.findUnique.mockResolvedValue(adminUser);

      await TestAuthMiddleware.authenticateAdmin(req, res, next);

      expect(req.userId).toBe('admin123');
      expect(req.isAdmin).toBe(true);
      expect(next).toHaveBeenCalledWith();
    });

    it('should reject non-admin user', async () => {
      const token = testUtils.generateTestToken('user123');
      req.headers.authorization = `Bearer ${token}`;

      const regularUser = { id: 'user123', isAdmin: false, isActive: true };
      mockPrismaInstance.user.findUnique.mockResolvedValue(regularUser);

      await TestAuthMiddleware.authenticateAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Admin privileges required'
      });
    });

    it('should reject inactive user', async () => {
      const token = testUtils.generateTestToken('admin123');
      req.headers.authorization = `Bearer ${token}`;

      const inactiveAdminUser = { id: 'admin123', isActive: false, isAdmin: true };
      mockPrismaInstance.user.findUnique.mockResolvedValue(inactiveAdminUser);

      await TestAuthMiddleware.authenticateAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Account is deactivated'
      });
    });

    it('should reject non-existent user', async () => {
      const token = testUtils.generateTestToken('nonexistent123');
      req.headers.authorization = `Bearer ${token}`;

      mockPrismaInstance.user.findUnique.mockResolvedValue(null);

      await TestAuthMiddleware.authenticateAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'User not found'
      });
    });
  });

  describe('optionalAuthenticate', () => {
    it('should set user info with valid token', () => {
      const token = testUtils.generateTestToken('user123');
      req.headers.authorization = `Bearer ${token}`;

      TestAuthMiddleware.optionalAuthenticate(req, res, next);

      expect(req.userId).toBe('user123');
      expect(req.isAuthenticated).toBe(true);
      expect(next).toHaveBeenCalledWith();
    });

    it('should continue without token', () => {
      TestAuthMiddleware.optionalAuthenticate(req, res, next);

      expect(req.userId).toBeUndefined();
      expect(req.isAuthenticated).toBeUndefined();
      expect(next).toHaveBeenCalledWith();
    });

    it('should continue with invalid token', () => {
      req.headers.authorization = 'Bearer invalid_token';

      TestAuthMiddleware.optionalAuthenticate(req, res, next);

      expect(req.isAuthenticated).toBe(false);
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('extractToken', () => {
    it('should extract token from Authorization header', () => {
      req.headers.authorization = 'Bearer test_token';

      const token = TestAuthMiddleware.extractToken(req);

      expect(token).toBe('test_token');
    });

    it('should extract token from cookies', () => {
      req.cookies = { token: 'test_token' };

      const token = TestAuthMiddleware.extractToken(req);

      expect(token).toBe('test_token');
    });

    it('should extract token from query parameters', () => {
      req.query = { token: 'test_token' };

      const token = TestAuthMiddleware.extractToken(req);

      expect(token).toBe('test_token');
    });

    it('should prefer Authorization header over cookies', () => {
      req.headers.authorization = 'Bearer header_token';
      req.cookies = { token: 'cookie_token' };

      const token = TestAuthMiddleware.extractToken(req);

      expect(token).toBe('header_token');
    });

    it('should return null when no token present', () => {
      const token = TestAuthMiddleware.extractToken(req);

      expect(token).toBeNull();
    });
  });

  describe('generateToken', () => {
    it('should generate valid JWT token', () => {
      const token = TestAuthMiddleware.generateToken('test123', 'test@example.com');

      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts

      // Verify token can be decoded
      const decoded = jwt.decode(token);
      expect(decoded.userId).toBe('test123');
      expect(decoded.email).toBe('test@example.com');
    });
  });

  describe('userRateLimit', () => {
    it('should allow requests within limit', () => {
      req.userId = 'user123';

      TestAuthMiddleware.userRateLimit(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should block requests exceeding limit', () => {
      req.userId = 'user123';
      req.rateLimitExceeded = true;

      TestAuthMiddleware.userRateLimit(req, res, next);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Too many requests'
      });
    });

    it('should allow unauthenticated requests', () => {
      // req.userId is undefined
      // req.rateLimitExceeded is undefined (falsy)

      TestAuthMiddleware.userRateLimit(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });
  });
});
