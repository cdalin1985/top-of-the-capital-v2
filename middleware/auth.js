/**
 * Authentication & Authorization Middleware
 * Centralized auth logic with role-based access control
 */

const jwt = require('jsonwebtoken');
const { PrismaClient } = require('../generated/prisma');
const securityConfig = require('../config/security');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

class AuthMiddleware {
  /**
   * Basic authentication middleware
   */
  static authenticate(req, res, next) {
    try {
      const token = AuthMiddleware.extractToken(req);

      if (!token) {
        return res.status(401).json({
          success: false,
          error: 'Authentication token required',
          code: 'NO_TOKEN'
        });
      }

      const jwtConfig = securityConfig.getJWTConfig();
      // Relax issuer/audience enforcement to improve compatibility
      const payload = jwt.verify(token, jwtConfig.secret);

      req.userId = payload.userId;
      req.userEmail = payload.email;
      req.tokenExp = payload.exp;

      next();
    } catch (error) {
      logger.warn('Authentication failed', {
        error: error.message,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: 'Invalid authentication token',
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

  /**
   * Admin role authentication
   */
  static async authenticateAdmin(req, res, next) {
    try {
      // First run basic authentication
      await new Promise((resolve, reject) => {
        AuthMiddleware.authenticate(req, res, err => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });

      // Check admin role
      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { id: true, isAdmin: true, isActive: true }
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'User not found',
          code: 'USER_NOT_FOUND'
        });
      }

      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          error: 'Account is deactivated',
          code: 'ACCOUNT_DEACTIVATED'
        });
      }

      if (!user.isAdmin) {
        logger.warn('Unauthorized admin access attempt', {
          userId: req.userId,
          ip: req.ip,
          endpoint: req.originalUrl
        });

        return res.status(403).json({
          success: false,
          error: 'Admin privileges required',
          code: 'INSUFFICIENT_PRIVILEGES'
        });
      }

      req.isAdmin = true;
      next();
    } catch (error) {
      logger.error('Admin authentication error', { error: error.message });
      return res.status(500).json({
        success: false,
        error: 'Authentication system error',
        code: 'SYSTEM_ERROR'
      });
    }
  }

  /**
   * Optional authentication - doesn't fail if no token
   */
  static optionalAuthenticate(req, res, next) {
    try {
      const token = AuthMiddleware.extractToken(req);

      if (!token) {
        return next();
      }

      const jwtConfig = securityConfig.getJWTConfig();
      const payload = jwt.verify(token, jwtConfig.secret);

      req.userId = payload.userId;
      req.userEmail = payload.email;
      req.isAuthenticated = true;
    } catch (error) {
      // Silent fail for optional auth
      req.isAuthenticated = false;
    }

    next();
  }

  /**
   * Resource ownership check
   */
  static requireOwnership(resourceModel, resourceIdParam = 'id') {
    return async (req, res, next) => {
      try {
        const resourceId = req.params[resourceIdParam];

        const resource = await prisma[resourceModel].findUnique({
          where: { id: resourceId },
          select: { userId: true, creatorId: true, player1Id: true, player2Id: true }
        });

        if (!resource) {
          return res.status(404).json({
            success: false,
            error: 'Resource not found',
            code: 'RESOURCE_NOT_FOUND'
          });
        }

        // Check various ownership patterns
        const isOwner =
          resource.userId === req.userId ||
          resource.creatorId === req.userId ||
          resource.player1Id === req.userId ||
          resource.player2Id === req.userId;

        if (!isOwner && !req.isAdmin) {
          return res.status(403).json({
            success: false,
            error: 'Access denied - not resource owner',
            code: 'NOT_OWNER'
          });
        }

        req.resource = resource;
        next();
      } catch (error) {
        logger.error('Ownership check failed', { error: error.message });
        return res.status(500).json({
          success: false,
          error: 'Authorization system error',
          code: 'SYSTEM_ERROR'
        });
      }
    };
  }

  /**
   * Rate limiting by user
   */
  static userRateLimit(maxRequests = 100, windowMs = 15 * 60 * 1000) {
    const userRequests = new Map();

    return (req, res, next) => {
      if (!req.userId) {
        return next();
      }

      const now = Date.now();
      const userKey = req.userId;

      if (!userRequests.has(userKey)) {
        userRequests.set(userKey, { count: 1, resetTime: now + windowMs });
        return next();
      }

      const userData = userRequests.get(userKey);

      if (now > userData.resetTime) {
        userData.count = 1;
        userData.resetTime = now + windowMs;
        return next();
      }

      if (userData.count >= maxRequests) {
        return res.status(429).json({
          success: false,
          error: 'Rate limit exceeded',
          code: 'RATE_LIMITED',
          resetTime: userData.resetTime
        });
      }

      userData.count++;
      next();
    };
  }

  /**
   * Extract JWT token from request
   */
  static extractToken(req) {
    // Check Authorization header (case-insensitive 'Bearer')
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const parts = authHeader.split(' ');
      if (parts.length === 2 && /^bearer$/i.test(parts[0])) {
        return parts[1];
      }
      // If header contains token only (malformed), still accept it
      if (!authHeader.includes(' ')) {
        return authHeader;
      }
    }

    // Check cookies
    if (req.cookies?.token) {
      return req.cookies.token;
    }

    // Check query parameter (for WebSocket connections)
    if (req.query?.token) {
      return req.query.token;
    }

    return null;
  }

  /**
   * Generate JWT token
   */
  static generateToken(payload) {
    const jwtConfig = securityConfig.getJWTConfig();

    return jwt.sign(
      {
        ...payload,
        iat: Math.floor(Date.now() / 1000)
      },
      jwtConfig.secret,
      {
        expiresIn: jwtConfig.expiresIn,
        issuer: jwtConfig.issuer,
        audience: jwtConfig.audience
      }
    );
  }

  /**
   * Refresh token validation
   */
  static async refreshToken(refreshToken) {
    try {
      const jwtConfig = securityConfig.getJWTConfig();
      const payload = jwt.verify(refreshToken, jwtConfig.secret);

      // Check if user still exists and is active
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, email: true, isActive: true }
      });

      if (!user || !user.isActive) {
        throw new Error('User not found or inactive');
      }

      return AuthMiddleware.generateToken({
        userId: user.id,
        email: user.email
      });
    } catch (error) {
      throw new Error('Token refresh failed');
    }
  }
}

module.exports = AuthMiddleware;
