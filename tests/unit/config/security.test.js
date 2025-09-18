/**
 * Security Configuration Tests
 * Tests the security configuration validation and settings
 */

const originalEnv = process.env;

// Import the module fresh each time to test environment variables
function requireFreshSecurityConfig() {
  delete require.cache[require.resolve('../../../config/security')];
  return require('../../../config/security');
}

describe('Security Configuration', () => {
  beforeEach(() => {
    // Reset environment variables
    process.env = { ...originalEnv };

    // Clear require cache to get fresh module instances
    jest.resetModules();
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('JWT Configuration', () => {
    test('should return valid JWT config with environment variables', () => {
      process.env.JWT_SECRET = 'test_secret_32_characters_minimum_123456';
      process.env.JWT_ISSUER = 'test-issuer';
      process.env.JWT_AUDIENCE = 'test-audience';
      process.env.JWT_EXPIRES_IN = '2h';

      const securityConfig = requireFreshSecurityConfig();
      const jwtConfig = securityConfig.getJWTConfig();

      expect(jwtConfig).toEqual({
        secret: 'test_secret_32_characters_minimum_123456',
        issuer: 'test-issuer',
        audience: 'test-audience',
        expiresIn: '2h'
      });
    });

    test('should use default values when environment variables are missing', () => {
      process.env.JWT_SECRET = 'test_secret_32_characters_minimum_123456';
      // Other variables are undefined

      const securityConfig = requireFreshSecurityConfig();
      const jwtConfig = securityConfig.getJWTConfig();

      expect(jwtConfig).toEqual({
        secret: 'test_secret_32_characters_minimum_123456',
        issuer: 'capital-ladder-app',
        audience: 'capital-ladder-users',
        expiresIn: '7d'
      });
    });

    test('should throw error when JWT_SECRET is missing', () => {
      delete process.env.JWT_SECRET;

      expect(() => {
        requireFreshSecurityConfig();
      }).toThrow('JWT_SECRET is required and must be at least 32 characters long');
    });

    test('should throw error when JWT_SECRET is too short', () => {
      process.env.JWT_SECRET = 'short_secret';

      expect(() => {
        requireFreshSecurityConfig();
      }).toThrow('JWT_SECRET is required and must be at least 32 characters long');
    });
  });

  describe('Database Configuration', () => {
    test('should return valid database config with environment variables', () => {
      process.env.DATABASE_URL = 'file:./test.db';
      process.env.JWT_SECRET = 'test_secret_32_characters_minimum_123456';

      const securityConfig = requireFreshSecurityConfig();
      const dbConfig = securityConfig.getDatabaseConfig();

      expect(dbConfig).toEqual({
        url: 'file:./test.db'
      });
    });

    test('should throw error when DATABASE_URL is missing', () => {
      process.env.JWT_SECRET = 'test_secret_32_characters_minimum_123456';
      delete process.env.DATABASE_URL;

      expect(() => {
        requireFreshSecurityConfig();
      }).toThrow('DATABASE_URL is required');
    });
  });

  describe('Upload Configuration', () => {
    test('should return valid upload config with defaults', () => {
      process.env.JWT_SECRET = 'test_secret_32_characters_minimum_123456';
      process.env.DATABASE_URL = 'file:./test.db';

      const securityConfig = requireFreshSecurityConfig();
      const uploadConfig = securityConfig.getUploadConfig();

      expect(uploadConfig).toEqual({
        maxFileSize: 5 * 1024 * 1024, // 5MB
        allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
        uploadPath: './public/uploads'
      });
    });

    test('should use custom max file size from environment', () => {
      process.env.JWT_SECRET = 'test_secret_32_characters_minimum_123456';
      process.env.DATABASE_URL = 'file:./test.db';
      process.env.MAX_FILE_SIZE = '5242880'; // 5MB

      const securityConfig = requireFreshSecurityConfig();
      const uploadConfig = securityConfig.getUploadConfig();

      expect(uploadConfig.maxFileSize).toBe(5242880);
    });
  });

  describe('Rate Limiting Configuration', () => {
    test('should return valid rate limiting config with defaults', () => {
      process.env.JWT_SECRET = 'test_secret_32_characters_minimum_123456';
      process.env.DATABASE_URL = 'file:./test.db';

      const securityConfig = requireFreshSecurityConfig();
      const rateLimitConfig = securityConfig.getRateLimitConfig();

      expect(rateLimitConfig).toEqual({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 200,
        skipSuccessfulRequests: false,
        standardHeaders: true,
        legacyHeaders: false
      });
    });

    test('should use custom rate limit values from environment', () => {
      process.env.JWT_SECRET = 'test_secret_32_characters_minimum_123456';
      process.env.DATABASE_URL = 'file:./test.db';
      process.env.RATE_LIMIT_WINDOW_MS = '600000'; // 10 minutes
      process.env.RATE_LIMIT_MAX = '50';

      const securityConfig = requireFreshSecurityConfig();
      const rateLimitConfig = securityConfig.getRateLimitConfig();

      expect(rateLimitConfig.windowMs).toBe(600000);
      expect(rateLimitConfig.max).toBe(50);
    });
  });

  describe('Environment Detection', () => {
    test('should detect production environment', () => {
      process.env.JWT_SECRET = 'test_secret_32_characters_minimum_123456';
      process.env.DATABASE_URL = 'file:./test.db';
      process.env.NODE_ENV = 'production';

      const securityConfig = requireFreshSecurityConfig();

      expect(securityConfig.isProduction()).toBe(true);
      expect(securityConfig.isDevelopment()).toBe(false);
      expect(securityConfig.isTest()).toBe(false);
    });

    test('should detect development environment', () => {
      process.env.JWT_SECRET = 'test_secret_32_characters_minimum_123456';
      process.env.DATABASE_URL = 'file:./test.db';
      process.env.NODE_ENV = 'development';

      const securityConfig = requireFreshSecurityConfig();

      expect(securityConfig.isProduction()).toBe(false);
      expect(securityConfig.isDevelopment()).toBe(true);
      expect(securityConfig.isTest()).toBe(false);
    });

    test('should detect test environment', () => {
      process.env.JWT_SECRET = 'test_secret_32_characters_minimum_123456';
      process.env.DATABASE_URL = 'file:./test.db';
      process.env.NODE_ENV = 'test';

      const securityConfig = requireFreshSecurityConfig();

      expect(securityConfig.isProduction()).toBe(false);
      expect(securityConfig.isDevelopment()).toBe(false);
      expect(securityConfig.isTest()).toBe(true);
    });

    test('should default to development when NODE_ENV is not set', () => {
      process.env.JWT_SECRET = 'test_secret_32_characters_minimum_123456';
      process.env.DATABASE_URL = 'file:./test.db';
      delete process.env.NODE_ENV;

      const securityConfig = requireFreshSecurityConfig();

      expect(securityConfig.isProduction()).toBe(false);
      expect(securityConfig.isDevelopment()).toBe(true);
      expect(securityConfig.isTest()).toBe(false);
    });
  });

  describe('CORS Configuration', () => {
    test('should return restrictive CORS config for production', () => {
      process.env.JWT_SECRET = 'test_secret_32_characters_minimum_123456';
      process.env.DATABASE_URL = 'file:./test.db';
      process.env.NODE_ENV = 'production';
      process.env.ALLOWED_ORIGINS = 'https://app.example.com,https://api.example.com';

      const securityConfig = requireFreshSecurityConfig();
      const corsConfig = securityConfig.getCORSConfig();

      expect(corsConfig.origin).toEqual(['https://app.example.com', 'https://api.example.com']);
      expect(corsConfig.credentials).toBe(true);
      expect(corsConfig.optionsSuccessStatus).toBe(200);
    });

    test('should return permissive CORS config for development', () => {
      process.env.JWT_SECRET = 'test_secret_32_characters_minimum_123456';
      process.env.DATABASE_URL = 'file:./test.db';
      process.env.NODE_ENV = 'development';

      const securityConfig = requireFreshSecurityConfig();
      const corsConfig = securityConfig.getCORSConfig();

      expect(corsConfig.origin).toBe(true);
      expect(corsConfig.credentials).toBe(true);
    });
  });

  describe('Input Validation', () => {
    test('should validate secure environment variables', () => {
      process.env.JWT_SECRET = 'test_secret_32_characters_minimum_123456';
      process.env.DATABASE_URL = 'file:./test.db';

      expect(() => {
        requireFreshSecurityConfig();
      }).not.toThrow();
    });

    test('should reject insecure JWT secrets in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'test_secret_32_characters_minimum_123456';
      process.env.DATABASE_URL = 'postgresql://localhost:5432/prod';

      expect(() => {
        requireFreshSecurityConfig();
      }).not.toThrow();
    });
  });
});
