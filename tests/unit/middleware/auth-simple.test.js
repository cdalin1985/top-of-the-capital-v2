/**
 * Simple Auth Middleware Tests
 * Debugging tests step by step
 */

const jwt = require('jsonwebtoken');

// Create a simple test to verify JWT tokens work
describe('JWT Token Tests', () => {
  const secret = 'test_jwt_secret_32_characters_long_123456';

  test('should create and verify a valid token', () => {
    const payload = {
      userId: 'user123',
      email: 'test@example.com',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour
      iss: 'test-issuer',
      aud: 'test-audience'
    };

    const token = jwt.sign(payload, secret);
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3); // JWT has 3 parts

    const decoded = jwt.verify(token, secret, {
      issuer: 'test-issuer',
      audience: 'test-audience'
    });

    expect(decoded.userId).toBe('user123');
    expect(decoded.email).toBe('test@example.com');
    expect(decoded.iss).toBe('test-issuer');
    expect(decoded.aud).toBe('test-audience');
  });

  test('should handle expired tokens', () => {
    const expiredPayload = {
      userId: 'user123',
      email: 'test@example.com',
      iat: Math.floor(Date.now() / 1000) - 60 * 60 * 2, // 2 hours ago
      exp: Math.floor(Date.now() / 1000) - 60 * 60, // 1 hour ago (expired)
      iss: 'test-issuer',
      aud: 'test-audience'
    };

    const expiredToken = jwt.sign(expiredPayload, secret);

    expect(() => {
      jwt.verify(expiredToken, secret, {
        issuer: 'test-issuer',
        audience: 'test-audience'
      });
    }).toThrow('jwt expired');
  });

  test('should handle malformed tokens', () => {
    expect(() => {
      jwt.verify('invalid.jwt.token', secret, {
        issuer: 'test-issuer',
        audience: 'test-audience'
      });
    }).toThrow();
  });
});

// Test the extractToken functionality in isolation
describe('Token Extraction', () => {
  function extractToken(req) {
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

  test('should extract token from Authorization header', () => {
    const req = {
      headers: {
        authorization: 'Bearer test_token_123'
      }
    };

    const token = extractToken(req);
    expect(token).toBe('test_token_123');
  });

  test('should extract token from cookies', () => {
    const req = {
      headers: {},
      cookies: {
        token: 'cookie_token_123'
      }
    };

    const token = extractToken(req);
    expect(token).toBe('cookie_token_123');
  });

  test('should extract token from query parameters', () => {
    const req = {
      headers: {},
      cookies: {},
      query: {
        token: 'query_token_123'
      }
    };

    const token = extractToken(req);
    expect(token).toBe('query_token_123');
  });

  test('should prefer Authorization header over cookies', () => {
    const req = {
      headers: {
        authorization: 'Bearer header_token'
      },
      cookies: {
        token: 'cookie_token'
      }
    };

    const token = extractToken(req);
    expect(token).toBe('header_token');
  });

  test('should return null when no token present', () => {
    const req = {
      headers: {},
      cookies: {},
      query: {}
    };

    const token = extractToken(req);
    expect(token).toBeNull();
  });
});

// Test simple authentication logic
describe('Simple Authentication Logic', () => {
  const secret = 'test_jwt_secret_32_characters_long_123456';
  const jwtConfig = {
    secret,
    issuer: 'test-issuer',
    audience: 'test-audience'
  };

  function createMockRes() {
    return {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
  }

  function simpleAuthenticate(req, res, next) {
    try {
      // Extract token
      let token = null;
      if (
        req.headers &&
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer ')
      ) {
        token = req.headers.authorization.substring(7);
      } else if (req.cookies && req.cookies.token) {
        token = req.cookies.token;
      }

      if (!token) {
        return res.status(401).json({
          success: false,
          error: 'Authentication token required',
          code: 'NO_TOKEN'
        });
      }

      // Verify token
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

  test('should authenticate valid token from Authorization header', () => {
    const payload = {
      userId: 'user123',
      email: 'test@example.com',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60,
      iss: 'test-issuer',
      aud: 'test-audience'
    };

    const token = jwt.sign(payload, secret);

    const req = {
      headers: {
        authorization: `Bearer ${token}`
      }
    };
    const res = createMockRes();
    const next = jest.fn();

    simpleAuthenticate(req, res, next);

    expect(req.userId).toBe('user123');
    expect(req.userEmail).toBe('test@example.com');
    expect(next).toHaveBeenCalledWith();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('should authenticate valid token from cookies', () => {
    const payload = {
      userId: 'user456',
      email: 'cookie@example.com',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60,
      iss: 'test-issuer',
      aud: 'test-audience'
    };

    const token = jwt.sign(payload, secret);

    const req = {
      headers: {},
      cookies: {
        token: token
      }
    };
    const res = createMockRes();
    const next = jest.fn();

    simpleAuthenticate(req, res, next);

    expect(req.userId).toBe('user456');
    expect(req.userEmail).toBe('cookie@example.com');
    expect(next).toHaveBeenCalledWith();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('should reject request without token', () => {
    const req = {
      headers: {},
      cookies: {}
    };
    const res = createMockRes();
    const next = jest.fn();

    simpleAuthenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Authentication token required',
      code: 'NO_TOKEN'
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('should reject expired token', () => {
    const expiredPayload = {
      userId: 'user123',
      email: 'test@example.com',
      iat: Math.floor(Date.now() / 1000) - 60 * 60 * 2,
      exp: Math.floor(Date.now() / 1000) - 60 * 60,
      iss: 'test-issuer',
      aud: 'test-audience'
    };

    const expiredToken = jwt.sign(expiredPayload, secret);

    const req = {
      headers: {
        authorization: `Bearer ${expiredToken}`
      }
    };
    const res = createMockRes();
    const next = jest.fn();

    simpleAuthenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Token has expired',
      code: 'TOKEN_EXPIRED'
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('should reject invalid token', () => {
    const req = {
      headers: {
        authorization: 'Bearer invalid_token'
      }
    };
    const res = createMockRes();
    const next = jest.fn();

    simpleAuthenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Invalid token',
      code: 'INVALID_TOKEN'
    });
    expect(next).not.toHaveBeenCalled();
  });
});
