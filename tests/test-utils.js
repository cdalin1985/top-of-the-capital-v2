/**
 * Test Utilities
 * Helper functions for creating mock objects and test data
 */

const jwt = require('jsonwebtoken');

class TestUtils {
  /**
   * Create mock Express request object
   */
  static createMockReq(overrides = {}) {
    return {
      headers: {},
      cookies: {},
      query: {},
      params: {},
      body: {},
      ip: '127.0.0.1',
      get: jest.fn().mockReturnValue('test-user-agent'),
      originalUrl: '/test',
      ...overrides
    };
  }

  /**
   * Create mock Express response object
   */
  static createMockRes() {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(), // Add set method for headers
      req: {} // Add req reference for response formatter
    };
    return res;
  }

  /**
   * Generate valid JWT token for testing
   */
  static generateTestToken(userId, email = 'test@example.com', options = {}) {
    const payload = {
      userId,
      email,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour
      iss: 'test-issuer',
      aud: 'test-audience',
      ...options
    };

    return jwt.sign(payload, 'test_jwt_secret_32_characters_long_123456');
  }

  /**
   * Generate expired JWT token for testing
   */
  static generateExpiredToken(userId, email = 'test@example.com') {
    const payload = {
      userId,
      email,
      iat: Math.floor(Date.now() / 1000) - 60 * 60 * 2, // 2 hours ago
      exp: Math.floor(Date.now() / 1000) - 60 * 60, // 1 hour ago (expired)
      iss: 'test-issuer',
      aud: 'test-audience'
    };

    return jwt.sign(payload, 'test_jwt_secret_32_characters_long_123456');
  }

  /**
   * Generate malformed JWT token for testing
   */
  static generateInvalidToken() {
    return 'invalid.jwt.token';
  }

  /**
   * Create mock user object
   */
  static createMockUser(overrides = {}) {
    return {
      id: 'test-user-123',
      email: 'test@example.com',
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
      isActive: true,
      isAdmin: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    };
  }

  /**
   * Create mock match object
   */
  static createMockMatch(overrides = {}) {
    return {
      id: 'test-match-123',
      player1Id: 'player1-123',
      player2Id: 'player2-123',
      player1Score: 0,
      player2Score: 0,
      status: 'active',
      venue: 'Test Venue',
      date: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    };
  }

  /**
   * Create mock challenge object
   */
  static createMockChallenge(overrides = {}) {
    return {
      id: 'test-challenge-123',
      challengerId: 'challenger-123',
      challengedId: 'challenged-123',
      status: 'pending',
      venue: 'Test Venue',
      proposedDate: new Date(),
      message: 'Test challenge message',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    };
  }

  /**
   * Clean test database tables
   */
  static async cleanDatabase(prisma) {
    // Disable foreign key constraints temporarily
    await prisma.$executeRaw`PRAGMA foreign_keys = OFF`;

    try {
      // Clean tables in reverse dependency order - using actual table names from Prisma
      const tables = ['notification_history', 'profile_views', 'Match', 'Challenge', 'User'];

      for (const table of tables) {
        try {
          await prisma.$executeRawUnsafe(`DELETE FROM ${table}`);
        } catch (error) {
          // Table might not exist in test database, skip silently
          console.log(`Skipping cleanup for table ${table}: ${error.message}`);
        }
      }
    } finally {
      // Re-enable foreign key constraints
      await prisma.$executeRaw`PRAGMA foreign_keys = ON`;
    }
  }

  /**
   * Seed test data
   */
  static async seedTestData(prisma) {
    // Create test users - matching Prisma schema fields
    const testUsers = [
      {
        id: 'test-user-1',
        email: 'user1@test.com',
        displayName: 'Test User1',
        password: 'hashedpassword123', // In real app, this would be bcrypt hashed
        isActive: true,
        isAdmin: false
      },
      {
        id: 'test-admin-1',
        email: 'admin@test.com',
        displayName: 'Admin User',
        password: 'hashedpassword123', // In real app, this would be bcrypt hashed
        isActive: true,
        isAdmin: true
      }
    ];

    for (const user of testUsers) {
      try {
        await prisma.user.upsert({
          where: { email: user.email },
          update: user,
          create: user
        });
      } catch (error) {
        console.log(`Failed to create test user ${user.email}:`, error.message);
      }
    }
  }

  /**
   * Wait for a specified duration (for testing async operations)
   */
  static async wait(ms = 100) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate random test data
   */
  static generateRandomString(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  static generateRandomEmail() {
    return `test-${this.generateRandomString(6)}@example.com`;
  }

  static generateRandomId() {
    return `test-${this.generateRandomString(12)}`;
  }
}

module.exports = TestUtils;
