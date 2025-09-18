/**
 * COMPREHENSIVE USERS ROUTE INTEGRATION TESTS
 * Story #3: Enhanced route testing coverage
 * Target: Achieve 80%+ coverage for routes/users.js
 */

const request = require('supertest');
const express = require('express');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { PrismaClient } = require('../../generated/prisma');

// Test setup
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mock file system for avatar uploads
const mockUploadDir = path.join(__dirname, '../../temp/test-uploads');

// Setup test environment
beforeAll(async () => {
  // Ensure test upload directory exists
  if (!fs.existsSync(mockUploadDir)) {
    fs.mkdirSync(mockUploadDir, { recursive: true });
  }
});

afterAll(async () => {
  // Cleanup test files
  if (fs.existsSync(mockUploadDir)) {
    fs.rmSync(mockUploadDir, { recursive: true, force: true });
  }
});

// Mock Prisma client for isolated testing
const mockPrismaClient = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn()
  },
  profileView: {
    create: jest.fn()
  },
  userAchievement: {
    findMany: jest.fn()
  },
  statistics: {
    upsert: jest.fn()
  }
};

// Mock the Prisma import
jest.mock('../../generated/prisma', () => ({
  PrismaClient: jest.fn(() => mockPrismaClient)
}));

// Import users router after mocking
const usersRouter = require('../../routes/users');
app.use('/api/users', usersRouter);

describe('Users Route Integration Tests', () => {
  const JWT_SECRET = process.env.JWT_SECRET || 'test_secret_key';
  let validToken;
  let testUserId;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup test user data
    testUserId = 'test-user-123';
    validToken = jwt.sign(
      { userId: testUserId, email: 'test@example.com' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  describe('POST /register', () => {
    const validRegistrationData = {
      email: 'newuser@example.com',
      displayName: 'Test User',
      password: 'securepassword123'
    };

    beforeEach(() => {
      mockPrismaClient.user.findUnique.mockResolvedValue(null); // User doesn't exist
      mockPrismaClient.user.create.mockResolvedValue({
        id: 'new-user-123',
        email: 'newuser@example.com',
        displayName: 'Test User',
        isActive: true,
        createdAt: new Date()
      });
    });

    test('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/users/register')
        .send(validRegistrationData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.token).toBeDefined();
      expect(response.body.user.email).toBe(validRegistrationData.email);
      
      // Verify Prisma calls
      expect(mockPrismaClient.user.findUnique).toHaveBeenCalledWith({
        where: { email: validRegistrationData.email }
      });
      expect(mockPrismaClient.user.create).toHaveBeenCalled();
    });

    test('should reject registration with invalid email', async () => {
      const response = await request(app)
        .post('/api/users/register')
        .send({
          ...validRegistrationData,
          email: 'invalid-email'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toBeDefined();
    });

    test('should reject registration with short password', async () => {
      const response = await request(app)
        .post('/api/users/register')
        .send({
          ...validRegistrationData,
          password: '123'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    test('should reject registration with short display name', async () => {
      const response = await request(app)
        .post('/api/users/register')
        .send({
          ...validRegistrationData,
          displayName: 'A'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    test('should reject registration for existing user', async () => {
      // Mock user already exists
      mockPrismaClient.user.findUnique.mockResolvedValue({
        id: 'existing-user',
        email: validRegistrationData.email
      });

      const response = await request(app)
        .post('/api/users/register')
        .send(validRegistrationData);

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('User with this email already exists');
    });

    test('should handle database errors during registration', async () => {
      mockPrismaClient.user.create.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/users/register')
        .send(validRegistrationData);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('GET /profile/:userId', () => {
    const mockUserProfile = {
      id: 'profile-user-123',
      displayName: 'Profile User',
      avatar: 'avatar.jpg',
      profileVisibility: 'public',
      achievements: [
        {
          isVisible: true,
          achievement: { id: 'ach1', name: 'First Win' },
          earnedAt: new Date()
        }
      ],
      statistics: {
        totalMatches: 10,
        wins: 7,
        losses: 3,
        winRate: 0.7
      },
      _count: {
        matchesWon: 7,
        challengesCreated: 5,
        challengesTargeted: 8
      }
    };

    beforeEach(() => {
      mockPrismaClient.user.findUnique.mockResolvedValue(mockUserProfile);
      mockPrismaClient.profileView.create.mockResolvedValue({});
    });

    test('should return user profile for authenticated user', async () => {
      const response = await request(app)
        .get('/api/users/profile/profile-user-123')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe('profile-user-123');
      expect(response.body.displayName).toBe('Profile User');
      
      // Verify profile view was logged
      expect(mockPrismaClient.profileView.create).toHaveBeenCalled();
    });

    test('should return 404 for non-existent user', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/users/profile/non-existent')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('User not found');
    });

    test('should respect private profile settings', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue({
        ...mockUserProfile,
        profileVisibility: 'private'
      });

      const response = await request(app)
        .get('/api/users/profile/profile-user-123')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Profile is private');
    });

    test('should allow viewing own private profile', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue({
        ...mockUserProfile,
        id: testUserId,
        profileVisibility: 'private'
      });

      const response = await request(app)
        .get(`/api/users/profile/${testUserId}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(testUserId);
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/users/profile/some-user');

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Missing token');
    });

    test('should handle invalid token', async () => {
      const response = await request(app)
        .get('/api/users/profile/some-user')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid token');
    });

    test('should not log profile view when viewing own profile', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue({
        ...mockUserProfile,
        id: testUserId
      });

      await request(app)
        .get(`/api/users/profile/${testUserId}`)
        .set('Authorization', `Bearer ${validToken}`);

      // Profile view should not be logged for own profile
      expect(mockPrismaClient.profileView.create).not.toHaveBeenCalled();
    });
  });

  describe('Authentication Middleware', () => {
    test('should extract token from Authorization header', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue({
        id: testUserId,
        displayName: 'Test User'
      });

      const response = await request(app)
        .get(`/api/users/profile/${testUserId}`)
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
    });

    test('should extract token from cookies', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue({
        id: testUserId,
        displayName: 'Test User'
      });

      const response = await request(app)
        .get(`/api/users/profile/${testUserId}`)
        .set('Cookie', `token=${validToken}`);

      expect(response.status).toBe(200);
    });

    test('should handle expired token', async () => {
      const expiredToken = jwt.sign(
        { userId: testUserId, email: 'test@example.com' },
        JWT_SECRET,
        { expiresIn: '-1h' } // Expired
      );

      const response = await request(app)
        .get(`/api/users/profile/${testUserId}`)
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid token');
    });

    test('should handle malformed token', async () => {
      const response = await request(app)
        .get(`/api/users/profile/${testUserId}`)
        .set('Authorization', 'Bearer malformed.token.here');

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid token');
    });
  });

  describe('Password Hashing', () => {
    test('should hash password before storing', async () => {
      const password = 'plaintextpassword';
      
      // Mock bcrypt behavior
      const mockHashedPassword = 'hashed_password_123';
      const bcryptSpy = jest.spyOn(bcrypt, 'hash').mockResolvedValue(mockHashedPassword);
      
      mockPrismaClient.user.findUnique.mockResolvedValue(null);
      mockPrismaClient.user.create.mockResolvedValue({
        id: 'new-user',
        email: 'test@example.com',
        displayName: 'Test User'
      });

      await request(app)
        .post('/api/users/register')
        .send({
          email: 'test@example.com',
          displayName: 'Test User',
          password: password
        });

      expect(bcryptSpy).toHaveBeenCalledWith(password, 12);
      
      bcryptSpy.mockRestore();
    });
  });

  describe('JWT Token Generation', () => {
    test('should generate valid JWT token on registration', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(null);
      mockPrismaClient.user.create.mockResolvedValue({
        id: 'new-user-123',
        email: 'test@example.com',
        displayName: 'Test User',
        isActive: true,
        createdAt: new Date()
      });

      const response = await request(app)
        .post('/api/users/register')
        .send({
          email: 'test@example.com',
          displayName: 'Test User',
          password: 'securepassword123'
        });

      expect(response.body.token).toBeDefined();
      
      // Verify token is valid
      const decoded = jwt.verify(response.body.token, JWT_SECRET);
      expect(decoded.userId).toBe('new-user-123');
      expect(decoded.email).toBe('test@example.com');
    });
  });

  describe('Input Validation', () => {
    test('should normalize email addresses', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(null);
      mockPrismaClient.user.create.mockResolvedValue({
        id: 'new-user',
        email: 'test@example.com', // Normalized
        displayName: 'Test User'
      });

      const response = await request(app)
        .post('/api/users/register')
        .send({
          email: '  TEST@EXAMPLE.COM  ', // Should be normalized
          displayName: 'Test User',
          password: 'securepassword123'
        });

      expect(response.status).toBe(201);
      expect(mockPrismaClient.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' }
      });
    });

    test('should trim display names', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(null);
      mockPrismaClient.user.create.mockResolvedValue({
        id: 'new-user',
        email: 'test@example.com',
        displayName: 'Test User' // Trimmed
      });

      const response = await request(app)
        .post('/api/users/register')
        .send({
          email: 'test@example.com',
          displayName: '  Test User  ', // Should be trimmed
          password: 'securepassword123'
        });

      expect(response.status).toBe(201);
      
      // Check that create was called with trimmed name
      const createCall = mockPrismaClient.user.create.mock.calls[0][0];
      expect(createCall.data.displayName).toBe('Test User');
    });

    test('should reject display names that are too long', async () => {
      const longName = 'A'.repeat(51); // 51 characters, limit is 50

      const response = await request(app)
        .post('/api/users/register')
        .send({
          email: 'test@example.com',
          displayName: longName,
          password: 'securepassword123'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });
  });

  describe('Error Handling', () => {
    test('should handle database connection errors', async () => {
      mockPrismaClient.user.findUnique.mockRejectedValue(new Error('Connection failed'));

      const response = await request(app)
        .post('/api/users/register')
        .send({
          email: 'test@example.com',
          displayName: 'Test User',
          password: 'securepassword123'
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Internal server error');
    });

    test('should handle Prisma unique constraint violations', async () => {
      const prismaError = new Error('Unique constraint failed');
      prismaError.code = 'P2002';
      
      mockPrismaClient.user.findUnique.mockResolvedValue(null);
      mockPrismaClient.user.create.mockRejectedValue(prismaError);

      const response = await request(app)
        .post('/api/users/register')
        .send({
          email: 'test@example.com',
          displayName: 'Test User',
          password: 'securepassword123'
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Security Features', () => {
    test('should not return password in user object', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(null);
      mockPrismaClient.user.create.mockResolvedValue({
        id: 'new-user',
        email: 'test@example.com',
        displayName: 'Test User',
        password: 'hashed_password', // This should not be in response
        isActive: true,
        createdAt: new Date()
      });

      const response = await request(app)
        .post('/api/users/register')
        .send({
          email: 'test@example.com',
          displayName: 'Test User',
          password: 'securepassword123'
        });

      expect(response.body.user.password).toBeUndefined();
    });

    test('should use secure JWT expiration time', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(null);
      mockPrismaClient.user.create.mockResolvedValue({
        id: 'new-user',
        email: 'test@example.com',
        displayName: 'Test User'
      });

      const response = await request(app)
        .post('/api/users/register')
        .send({
          email: 'test@example.com',
          displayName: 'Test User',
          password: 'securepassword123'
        });

      const decoded = jwt.verify(response.body.token, JWT_SECRET);
      const expirationTime = decoded.exp - decoded.iat;
      
      // Should expire in 7 days (7 * 24 * 60 * 60 = 604800 seconds)
      expect(expirationTime).toBe(604800);
    });
  });
});