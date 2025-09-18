/**
 * Security Configuration Module
 * Centralized security settings and validation
 */

const crypto = require('crypto');

class SecurityConfig {
  constructor() {
    this.validateEnvironment();
  }

  validateEnvironment() {
    // Validate JWT secret first with specific message
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is required and must be at least 32 characters long');
    }
    if (process.env.JWT_SECRET.length < 32) {
      throw new Error('JWT_SECRET is required and must be at least 32 characters long');
    }

    // Validate database URL
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is required');
    }

    // NODE_ENV defaults to 'development' if not set, so no validation needed
  }

  getJWTConfig() {
    return {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      issuer: process.env.JWT_ISSUER || 'capital-ladder-app',
      audience: process.env.JWT_AUDIENCE || 'capital-ladder-users'
    };
  }

  generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  isProduction() {
    return (process.env.NODE_ENV || 'development') === 'production';
  }

  isDevelopment() {
    return (process.env.NODE_ENV || 'development') === 'development';
  }

  isTest() {
    return (process.env.NODE_ENV || 'development') === 'test';
  }

  getDatabaseConfig() {
    return {
      url: process.env.DATABASE_URL
    };
  }

  getCORSConfig() {
    if (this.isProduction()) {
      return {
        origin: (process.env.CORS_ORIGINS || 'https://app.example.com,https://api.example.com').split(','),
        credentials: true,
        optionsSuccessStatus: 200
      };
    }
    return {
      origin: true,
      credentials: true,
      optionsSuccessStatus: 200
    };
  }

  getAllowedVenues() {
    return (process.env.ALLOWED_VENUES || 'Valley Hub,Eagles 4040').split(',').map(v => v.trim());
  }

  getUploadConfig() {
    return {
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB
      allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
      uploadPath: process.env.UPLOAD_PATH || './public/uploads'
    };
  }

  getRateLimitConfig() {
    // Derive values from env with sensible defaults
    const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || String(15 * 60 * 1000), 10); // 15 minutes
    const max = parseInt(process.env.RATE_LIMIT_MAX || '200', 10);

    return {
      windowMs,
      max,
      // Maintain previous behavior for unit tests: only skipSuccessfulRequests in development
      skipSuccessfulRequests: this.isDevelopment(),
      standardHeaders: true,
      legacyHeaders: false
    };
  }
}

module.exports = new SecurityConfig();
