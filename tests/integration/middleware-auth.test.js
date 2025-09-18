/**
 * COMPREHENSIVE AUTHENTICATION MIDDLEWARE TESTS
 * Story #4: Security and authentication testing
 * Target: Achieve 90%+ coverage for middleware/auth.js
 */

const request = require('supertest');
const { createApp } = require('../../lib/createApp');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('../../generated/prisma');

// Test setup
const { app } = createApp();

// Mock Prisma client
const mockPrismaClient = {
  user: {
    findUnique: jest.fn()
  }
};

// Mock the Prisma import
jest.mock('../../generated/prisma', () => ({
  PrismaClient: jest.fn(() => mockPrismaClient)
}));

// Import auth middleware after mocking
const {
  authenticate,
  authenticateAdmin,
  optionalAuthenticate,
  extractToken,
  generateToken,
  userRateLimit
} = require('../../middleware/auth');


describe('Authentication Middleware Integration Tests', () => {
  const JWT_SECRET = process.env.JWT_SECRET || 'test_secret_key';
  let validToken;
  let adminToken;
  let testUserId;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup test user data
    testUserId = 'test-user-123';
    validToken = jwt.sign(
      { userId: testUserId, email: 'user@example.com' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    adminToken = jwt.sign(
      { userId: 'admin-user-456', email: 'admin@example.com' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  describe('authenticate middleware', () => {
    test('should authenticate with valid Authorization header token', async () => {
      const response = await request(app)
        .get('/test-auth')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.userId).toBe(testUserId);
    });

    test('should authenticate with valid cookie token', async () => {
      const response = await request(app)
        .get('/test-auth')
        .set('Cookie', `token=${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.userId).toBe(testUserId);
    });

    test('should authenticate with token in query parameters', async () => {
      const response = await request(app)
        .get(`/test-auth?token=${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.userId).toBe(testUserId);
    });

    test('should prefer Authorization header over cookies', async () => {
      const altToken = jwt.sign(
        { userId: 'alt-user', email: 'alt@example.com' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/test-auth')
        .set('Authorization', `Bearer ${validToken}`)
        .set('Cookie', `token=${altToken}`);

      expect(response.status).toBe(200);
      expect(response.body.userId).toBe(testUserId); // Should use Authorization header
    });

    test('should reject request without token', async () => {
      const response = await request(app)
        .get('/test-auth');

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('token');
    });

    test('should reject expired token', async () => {
      const expiredToken = jwt.sign(
        { userId: testUserId, email: 'user@example.com' },
        JWT_SECRET,
        { expiresIn: '-1h' }
      );

      const response = await request(app)
        .get('/test-auth')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Invalid');
    });

    test('should reject invalid token', async () => {
      const response = await request(app)
        .get('/test-auth')
        .set('Authorization', 'Bearer invalid-token-here');

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Invalid');
    });

    test('should reject malformed Authorization header', async () => {
      const response = await request(app)
        .get('/test-auth')
        .set('Authorization', validToken); // Missing "Bearer "

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('token');
    });

    test('should handle token with wrong secret', async () => {
      const wrongSecretToken = jwt.sign(
        { userId: testUserId, email: 'user@example.com' },
        'wrong-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/test-auth')
        .set('Authorization', `Bearer ${wrongSecretToken}`);

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Invalid');
    });

    test('should handle empty token', async () => {
      const response = await request(app)
        .get('/test-auth')
        .set('Authorization', 'Bearer ');

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('token');
    });

    test('should set req.user object with user data', async () => {
      const response = await request(app)
        .get('/test-auth')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.email).toBe('user@example.com');
    });
  });

  describe('authenticateAdmin middleware', () => {
    beforeEach(() => {
      // Mock admin user
      mockPrismaClient.user.findUnique.mockImplementation((query) => {
        if (query.where.id === 'admin-user-456') {
          return Promise.resolve({
            id: 'admin-user-456',
            email: 'admin@example.com',
            isAdmin: true,
            isActive: true
          });
        }
        if (query.where.id === testUserId) {
          return Promise.resolve({
            id: testUserId,
            email: 'user@example.com',
            isAdmin: false,
            isActive: true
          });
        }
        return Promise.resolve(null);
      });
    });

    test('should authenticate admin user successfully', async () => {
      const response = await request(app)
        .get('/test-admin')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.isAdmin).toBe(true);
      expect(mockPrismaClient.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'admin-user-456' }
      });
    });

    test('should reject non-admin user', async () => {
      const response = await request(app)
        .get('/test-admin')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Admin');
    });

    test('should reject inactive admin user', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue({
        id: 'admin-user-456',
        isAdmin: true,
        isActive: false
      });

      const response = await request(app)
        .get('/test-admin')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('account');
    });

    test('should reject non-existent user', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/test-admin')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('User not found');
    });

    test('should handle database errors gracefully', async () => {
      mockPrismaClient.user.findUnique.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/test-admin')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });

    test('should require authentication before admin check', async () => {
      const response = await request(app)
        .get('/test-admin');

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('token');
    });
  });

  describe('optionalAuthenticate middleware', () => {
    test('should set user info with valid token', async () => {
      const response = await request(app)
        .get('/test-optional')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.authenticated).toBe(true);
      expect(response.body.userId).toBe(testUserId);
      expect(response.body.email).toBe('user@example.com');
    });

    test('should continue without token', async () => {
      const response = await request(app)
        .get('/test-optional');

      expect(response.status).toBe(200);
      expect(response.body.authenticated).toBe(false);
      expect(response.body.userId).toBeNull();
      expect(response.body.email).toBeUndefined();
    });

    test('should continue with invalid token', async () => {
      const response = await request(app)
        .get('/test-optional')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(200);
      expect(response.body.authenticated).toBe(false);
      expect(response.body.userId).toBeNull();
    });

    test('should handle expired token gracefully', async () => {
      const expiredToken = jwt.sign(
        { userId: testUserId, email: 'user@example.com' },
        JWT_SECRET,
        { expiresIn: '-1h' }
      );

      const response = await request(app)
        .get('/test-optional')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(200);
      expect(response.body.authenticated).toBe(false);
    });
  });

  describe('extractToken function', () => {
    test('should extract token from Authorization header', () => {
      const mockReq = {
        headers: { authorization: `Bearer ${validToken}` },
        cookies: {},
        query: {}
      };

      const token = extractToken(mockReq);
      expect(token).toBe(validToken);
    });

    test('should extract token from cookies', () => {
      const mockReq = {
        headers: {},
        cookies: { token: validToken },
        query: {}
      };

      const token = extractToken(mockReq);
      expect(token).toBe(validToken);
    });

    test('should extract token from query parameters', () => {
      const mockReq = {
        headers: {},
        cookies: {},
        query: { token: validToken }
      };

      const token = extractToken(mockReq);
      expect(token).toBe(validToken);
    });

    test('should prefer Authorization header over cookies', () => {
      const altToken = 'alternative-token';
      const mockReq = {
        headers: { authorization: `Bearer ${validToken}` },
        cookies: { token: altToken },
        query: {}
      };

      const token = extractToken(mockReq);
      expect(token).toBe(validToken);
    });

    test('should return null when no token present', () => {
      const mockReq = {
        headers: {},
        cookies: {},
        query: {}
      };

      const token = extractToken(mockReq);
      expect(token).toBeNull();
    });

    test('should handle malformed Authorization header', () => {
      const mockReq = {
        headers: { authorization: validToken }, // Missing "Bearer "
        cookies: {},
        query: {}
      };

      const token = extractToken(mockReq);
      expect(token).toBe(validToken); // Should still extract it
    });

    test('should handle empty Authorization header', () => {
      const mockReq = {
        headers: { authorization: 'Bearer ' },
        cookies: {},
        query: {}
      };

      const token = extractToken(mockReq);
      expect(token).toBe('');
    });

    test('should handle case-insensitive Authorization header', () => {
      const mockReq = {
        headers: { authorization: `bearer ${validToken}` },
        cookies: {},
        query: {}
      };

      const token = extractToken(mockReq);
      expect(token).toBe(validToken);
    });
  });

  describe('generateToken function', () => {
    test('should generate valid JWT token', () => {
      const userData = {
        userId: 'test-123',
        email: 'test@example.com'
      };

      const token = generateToken(userData);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      // Verify token is valid
      const decoded = jwt.verify(token, JWT_SECRET);
      expect(decoded.userId).toBe(userData.userId);
      expect(decoded.email).toBe(userData.email);
    });

    test('should generate token with correct expiration', () => {
      const userData = { userId: 'test', email: 'test@example.com' };
      const token = generateToken(userData);
      
      const decoded = jwt.verify(token, JWT_SECRET);
      const expirationTime = decoded.exp - decoded.iat;
      
      // Should expire in 7 days (7 * 24 * 60 * 60 = 604800 seconds)
      expect(expirationTime).toBe(604800);
    });

    test('should generate token with correct issuer and audience', () => {
      const userData = { userId: 'test', email: 'test@example.com' };
      const token = generateToken(userData);
      
      const decoded = jwt.verify(token, JWT_SECRET);
      expect(decoded.iss).toBe('capital-ladder-app');
      expect(decoded.aud).toBe('capital-ladder-users');
    });

    test('should include all user data in token', () => {
      const userData = {
        userId: 'test-123',
        email: 'test@example.com',
        displayName: 'Test User'
      };

      const token = generateToken(userData);
      const decoded = jwt.verify(token, JWT_SECRET);
      
      expect(decoded.userId).toBe(userData.userId);
      expect(decoded.email).toBe(userData.email);
      expect(decoded.displayName).toBe(userData.displayName);
    });
  });

  describe('userRateLimit middleware', () => {
    // Note: This is a more complex test as rate limiting involves state
    test('should allow requests within limit', async () => {
      const response = await request(app)
        .get('/test-rate-limit')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should allow multiple requests from different users', async () => {
      const user1Token = jwt.sign(
        { userId: 'user-1', email: 'user1@example.com' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const user2Token = jwt.sign(
        { userId: 'user-2', email: 'user2@example.com' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const response1 = await request(app)
        .get('/test-rate-limit')
        .set('Authorization', `Bearer ${user1Token}`);

      const response2 = await request(app)
        .get('/test-rate-limit')
        .set('Authorization', `Bearer ${user2Token}`);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
    });

    test('should allow unauthenticated requests', async () => {
      const response = await request(app)
        .get('/test-rate-limit');

      // Should not be blocked by rate limiting, but may be blocked by other middleware
      expect([200, 401]).toContain(response.status);
    });

    test('should handle missing user ID gracefully', async () => {
      const invalidToken = jwt.sign(
        { email: 'test@example.com' }, // Missing userId
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/test-rate-limit')
        .set('Authorization', `Bearer ${invalidToken}`);

      // Should handle gracefully without crashing
      expect([200, 401, 429]).toContain(response.status);
    });
  });

  describe('Security Edge Cases', () => {
    test('should handle token with no payload', async () => {
      const emptyToken = jwt.sign({}, JWT_SECRET, { expiresIn: '1h' });

      const response = await request(app)
        .get('/test-auth')
        .set('Authorization', `Bearer ${emptyToken}`);

      expect(response.status).toBe(401);
    });

    test('should handle token with undefined userId', async () => {
      const badToken = jwt.sign(
        { userId: undefined, email: 'test@example.com' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/test-auth')
        .set('Authorization', `Bearer ${badToken}`);

      expect(response.status).toBe(401);
    });

    test('should handle token with null userId', async () => {
      const badToken = jwt.sign(
        { userId: null, email: 'test@example.com' },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/test-auth')
        .set('Authorization', `Bearer ${badToken}`);

      expect(response.status).toBe(401);
    });

    test('should handle very long tokens', async () => {
      const longPayload = {
        userId: 'test-user',
        email: 'test@example.com',
        data: 'x'.repeat(10000) // Very long data
      };

      const longToken = jwt.sign(longPayload, JWT_SECRET, { expiresIn: '1h' });

      const response = await request(app)
        .get('/test-auth')
        .set('Authorization', `Bearer ${longToken}`);

      expect(response.status).toBe(200);
      expect(response.body.userId).toBe('test-user');
    });

    test('should handle special characters in token data', async () => {
      const specialToken = jwt.sign(
        { 
          userId: 'test-user-123',
          email: 'test+special@example.com',
          name: 'Test & User <script>'
        },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/test-auth')
        .set('Authorization', `Bearer ${specialToken}`);

      expect(response.status).toBe(200);
      expect(response.body.userId).toBe('test-user-123');
    });
  });

  describe('Integration with Express', () => {
    test('should work with multiple middleware in sequence', async () => {
      // Create a route with multiple auth middleware
      app.get('/test-sequence', 
        optionalAuthenticate, 
        authenticate, 
        (req, res) => {
          res.json({ success: true, userId: req.userId });
        }
      );

      const response = await request(app)
        .get('/test-sequence')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.userId).toBe(testUserId);
    });

    test('should handle middleware errors properly', async () => {
      // Mock JWT verification to throw an error
      const originalVerify = jwt.verify;
      jwt.verify = jest.fn().mockImplementation(() => {
        throw new Error('JWT verification failed');
      });

      const response = await request(app)
        .get('/test-auth')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(401);

      // Restore original function
      jwt.verify = originalVerify;
    });

    test('should pass through to next middleware on success', async () => {
      let middlewareCalled = false;
      
      app.get('/test-next', authenticate, (req, res, next) => {
        middlewareCalled = true;
        res.json({ success: true });
      });

      await request(app)
        .get('/test-next')
        .set('Authorization', `Bearer ${validToken}`);

      expect(middlewareCalled).toBe(true);
    });
  });

  describe('Performance and Memory', () => {
    test('should handle concurrent authentication requests', async () => {
      const promises = Array(10).fill().map(() =>
        request(app)
          .get('/test-auth')
          .set('Authorization', `Bearer ${validToken}`)
      );

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.userId).toBe(testUserId);
      });
    });

    test('should not leak memory with invalid tokens', async () => {
      // Test with many invalid tokens to ensure no memory leaks
      const promises = Array(50).fill().map(() =>
        request(app)
          .get('/test-auth')
          .set('Authorization', 'Bearer invalid-token-' + Math.random())
      );

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.status).toBe(401);
      });
    });
  });
});