/**
 * Test Setup and Global Utilities
 * Configures test environment and provides helper functions
 */

const { PrismaClient } = require('../generated/prisma');
const AuthMiddleware = require('../middleware/auth');

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_32_characters_long_123';
process.env.DATABASE_URL = 'file:./test.db';
process.env.LOG_LEVEL = 'error'; // Reduce log noise in tests

// Global test utilities
global.testUtils = {
  // Database utilities
  async cleanDatabase() {
    const prisma = new PrismaClient();
    try {
      // Clean in reverse dependency order - handle missing tables gracefully
      const cleanupOperations = [
        () => prisma.profileView?.deleteMany?.(),
        () => prisma.playerAchievement?.deleteMany?.(),
        () => prisma.achievement?.deleteMany?.(),
        () => prisma.playerStatistics?.deleteMany?.(),
        () => prisma.notificationHistory?.deleteMany?.(),
        () => prisma.notificationPreferences?.deleteMany?.(),
        () => prisma.pushSubscription?.deleteMany?.(),
        () => prisma.match?.deleteMany?.(),
        () => prisma.challenge?.deleteMany?.(),
        () => prisma.user?.deleteMany?.()
      ];

      for (const operation of cleanupOperations) {
        try {
          await operation();
        } catch (error) {
          // Skip if table doesn't exist
          if (!error.message?.includes('does not exist')) {
            throw error;
          }
        }
      }
    } finally {
      await prisma.$disconnect();
    }
  },

  // User creation utilities
  async createTestUser(overrides = {}) {
    const prisma = new PrismaClient();
    try {
      const userData = {
        email: 'test@example.com',
        password: '$2a$10$TestHashPassword123456789', // Pre-hashed for speed
        displayName: 'Test User',
        isActive: true,
        ...overrides
      };
      return await prisma.user.create({ data: userData });
    } finally {
      await prisma.$disconnect();
    }
  },

  async createTestAdmin(overrides = {}) {
    return this.createTestUser({
      email: 'admin@example.com',
      displayName: 'Test Admin',
      isAdmin: true,
      ...overrides
    });
  },

  // Authentication utilities
  generateTestToken(userId, overrides = {}) {
    const payload = {
      userId,
      email: 'test@example.com',
      ...overrides
    };
    return AuthMiddleware.generateToken(payload);
  },

  generateExpiredToken(userId) {
    const jwt = require('jsonwebtoken');
    return jwt.sign(
      { userId, email: 'test@example.com' },
      process.env.JWT_SECRET,
      { expiresIn: '-1h' } // Already expired
    );
  },

  // Challenge utilities
  async createTestChallenge(creatorId, targetId, overrides = {}) {
    const prisma = new PrismaClient();
    try {
      const challengeData = {
        creatorId,
        targetUserId: targetId,
        discipline: 'Eight Ball',
        gamesToWin: 10,
        status: 'pending',
        ...overrides
      };
      return await prisma.challenge.create({ data: challengeData });
    } finally {
      await prisma.$disconnect();
    }
  },

  // Match utilities
  async createTestMatch(player1Id, player2Id, overrides = {}) {
    const prisma = new PrismaClient();
    try {
      const matchData = {
        player1Id,
        player2Id,
        discipline: 'Eight Ball',
        gamesToWin: 10,
        scores: { [player1Id]: 0, [player2Id]: 0 },
        status: 'active',
        ...overrides
      };
      return await prisma.match.create({ data: matchData });
    } finally {
      await prisma.$disconnect();
    }
  },

  // HTTP request utilities
  async makeAuthenticatedRequest(app, method, path, token, data = null) {
    const request = require('supertest');
    let req = request(app)[method.toLowerCase()](path);

    if (token) {
      req = req.set('Authorization', `Bearer ${token}`);
    }

    if (data) {
      req = req.send(data);
    }

    return req;
  },

  // Validation utilities
  expectValidationError(response, field = null) {
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('error');

    if (field) {
      expect(response.body.error).toContain(field);
    }
  },

  expectAuthError(response, code = 'NO_TOKEN') {
    expect([401, 403]).toContain(response.status);
    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('code', code);
  },

  expectSuccess(response, expectedData = null) {
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);

    if (expectedData) {
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toMatchObject(expectedData);
    }
  },

  // Time utilities
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  // Mock utilities
  createMockSocket() {
    return {
      emit: jest.fn(),
      join: jest.fn(),
      leave: jest.fn(),
      to: jest.fn(() => ({ emit: jest.fn() })),
      broadcast: { emit: jest.fn() },
      handshake: { auth: {} }
    };
  },

  createMockReq(overrides = {}) {
    return {
      body: {},
      params: {},
      query: {},
      headers: {},
      cookies: {},
      ip: '127.0.0.1',
      get: jest.fn(),
      ...overrides
    };
  },

  createMockRes() {
    const res = {
      status: jest.fn(() => res),
      json: jest.fn(() => res),
      send: jest.fn(() => res),
      cookie: jest.fn(() => res),
      clearCookie: jest.fn(() => res),
      set: jest.fn(() => res),
      get: jest.fn()
    };
    return res;
  },

  // File utilities
  async cleanupUploads() {
    const fs = require('fs').promises;
    const path = require('path');

    try {
      const uploadsDir = path.join(__dirname, '..', 'public', 'uploads', 'avatars');
      const files = await fs.readdir(uploadsDir);

      await Promise.all(
        files
          .filter(file => file.startsWith('avatar_test_'))
          .map(file => fs.unlink(path.join(uploadsDir, file)))
      );
    } catch (error) {
      // Directory might not exist, ignore
    }
  },

  // Achievement utilities
  async createTestAchievement(overrides = {}) {
    const prisma = new PrismaClient();
    try {
      const achievementData = {
        name: 'Test Achievement',
        description: 'A test achievement',
        icon: '🏆',
        category: 'test',
        rarity: 'common',
        points: 10,
        criteria: JSON.stringify({ test: true }),
        ...overrides
      };
      return await prisma.achievement.create({ data: achievementData });
    } finally {
      await prisma.$disconnect();
    }
  },

  // Statistics utilities
  async createTestStatistics(userId, overrides = {}) {
    const prisma = new PrismaClient();
    try {
      const statsData = {
        userId,
        totalMatches: 0,
        matchesWon: 0,
        matchesLost: 0,
        winPercentage: 0.0,
        ...overrides
      };
      return await prisma.playerStatistics.create({ data: statsData });
    } finally {
      await prisma.$disconnect();
    }
  }
};

// Global test hooks
beforeEach(async () => {
  // Clean database before each test
  await global.testUtils.cleanDatabase();
});

afterAll(async () => {
  // Final cleanup
  await global.testUtils.cleanDatabase();
  await global.testUtils.cleanupUploads();
});

// Increase timeout for integration tests
jest.setTimeout(30000);
