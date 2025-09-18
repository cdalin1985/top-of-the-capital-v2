/**
 * COMPREHENSIVE NOTIFICATIONS ROUTE INTEGRATION TESTS
 * Story #3: Enhanced route testing coverage
 * Target: Achieve 80%+ coverage for routes/notifications.js
 */

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

// Test setup
const app = express();
app.use(express.json());
app.use((req, res, next) => {
  req.get = (header) => req.headers[header.toLowerCase()];
  next();
});

// Mock NotificationService
const mockNotificationService = {
  getVapidPublicKey: jest.fn(),
  createSubscription: jest.fn(),
  removeSubscription: jest.fn(),
  getUserPreferences: jest.fn(),
  updatePreferences: jest.fn(),
  getUserNotifications: jest.fn(),
  markNotificationRead: jest.fn(),
  sendNotification: jest.fn()
};

// Mock the NotificationService import
jest.mock('../../lib/notification-service', () => {
  return jest.fn(() => mockNotificationService);
});

// Import notifications router after mocking
const notificationsRouter = require('../../routes/notifications');
app.use('/api/notifications', notificationsRouter);

describe('Notifications Route Integration Tests', () => {
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

  describe('GET /vapid-public-key', () => {
    test('should return VAPID public key when configured', async () => {
      const mockPublicKey = 'test-vapid-public-key-123';
      mockNotificationService.getVapidPublicKey.mockReturnValue(mockPublicKey);

      const response = await request(app)
        .get('/api/notifications/vapid-public-key');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.publicKey).toBe(mockPublicKey);
      expect(mockNotificationService.getVapidPublicKey).toHaveBeenCalled();
    });

    test('should return 503 when VAPID not configured', async () => {
      mockNotificationService.getVapidPublicKey.mockReturnValue(null);

      const response = await request(app)
        .get('/api/notifications/vapid-public-key');

      expect(response.status).toBe(503);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Push notifications not configured');
    });

    test('should handle service errors', async () => {
      mockNotificationService.getVapidPublicKey.mockImplementation(() => {
        throw new Error('Service error');
      });

      const response = await request(app)
        .get('/api/notifications/vapid-public-key');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('POST /subscribe', () => {
    const validSubscription = {
      endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint',
      keys: {
        p256dh: 'test-p256dh-key',
        auth: 'test-auth-key'
      }
    };

    beforeEach(() => {
      mockNotificationService.createSubscription.mockResolvedValue({
        existing: false,
        subscription: { id: 'sub-123' }
      });
    });

    test('should create subscription for authenticated user', async () => {
      const response = await request(app)
        .post('/api/notifications/subscribe')
        .set('Authorization', `Bearer ${validToken}`)
        .set('User-Agent', 'Test Browser 1.0')
        .send({ subscription: validSubscription });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Subscription created');
      
      expect(mockNotificationService.createSubscription).toHaveBeenCalledWith(
        testUserId,
        validSubscription,
        'Test Browser 1.0'
      );
    });

    test('should handle existing subscription', async () => {
      mockNotificationService.createSubscription.mockResolvedValue({
        existing: true,
        subscription: { id: 'existing-sub' }
      });

      const response = await request(app)
        .post('/api/notifications/subscribe')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ subscription: validSubscription });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Subscription already exists');
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .post('/api/notifications/subscribe')
        .send({ subscription: validSubscription });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Missing token');
    });

    test('should validate subscription data', async () => {
      const response = await request(app)
        .post('/api/notifications/subscribe')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ subscription: null });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid subscription data');
    });

    test('should validate subscription endpoint', async () => {
      const invalidSubscription = {
        keys: {
          p256dh: 'test-key',
          auth: 'test-auth'
        }
        // Missing endpoint
      };

      const response = await request(app)
        .post('/api/notifications/subscribe')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ subscription: invalidSubscription });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid subscription data');
    });

    test('should handle service errors', async () => {
      mockNotificationService.createSubscription.mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .post('/api/notifications/subscribe')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ subscription: validSubscription });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to create subscription');
    });

    test('should extract user agent from request', async () => {
      const userAgent = 'Mozilla/5.0 Test Browser';
      
      await request(app)
        .post('/api/notifications/subscribe')
        .set('Authorization', `Bearer ${validToken}`)
        .set('User-Agent', userAgent)
        .send({ subscription: validSubscription });

      expect(mockNotificationService.createSubscription).toHaveBeenCalledWith(
        testUserId,
        validSubscription,
        userAgent
      );
    });
  });

  describe('POST /unsubscribe', () => {
    const testEndpoint = 'https://fcm.googleapis.com/fcm/send/test-endpoint';

    beforeEach(() => {
      mockNotificationService.removeSubscription.mockResolvedValue(true);
    });

    test('should remove subscription for authenticated user', async () => {
      const response = await request(app)
        .post('/api/notifications/unsubscribe')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ endpoint: testEndpoint });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Subscription removed');
      
      expect(mockNotificationService.removeSubscription).toHaveBeenCalledWith(
        testUserId,
        testEndpoint
      );
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .post('/api/notifications/unsubscribe')
        .send({ endpoint: testEndpoint });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Missing token');
    });

    test('should validate endpoint parameter', async () => {
      const response = await request(app)
        .post('/api/notifications/unsubscribe')
        .set('Authorization', `Bearer ${validToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Endpoint required');
    });

    test('should handle failed removal', async () => {
      mockNotificationService.removeSubscription.mockResolvedValue(false);

      const response = await request(app)
        .post('/api/notifications/unsubscribe')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ endpoint: testEndpoint });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to remove subscription');
    });

    test('should handle service errors', async () => {
      mockNotificationService.removeSubscription.mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .post('/api/notifications/unsubscribe')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ endpoint: testEndpoint });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to remove subscription');
    });
  });

  describe('GET /preferences', () => {
    const mockPreferences = {
      challengesEnabled: true,
      matchesEnabled: true,
      systemEnabled: false,
      quietHoursStart: '22:00',
      quietHoursEnd: '08:00'
    };

    beforeEach(() => {
      mockNotificationService.getUserPreferences.mockResolvedValue(mockPreferences);
    });

    test('should return user preferences for authenticated user', async () => {
      const response = await request(app)
        .get('/api/notifications/preferences')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.preferences).toEqual({
        challenges: true,
        matches: true,
        system: false,
        quietHours: {
          start: '22:00',
          end: '08:00'
        }
      });
      
      expect(mockNotificationService.getUserPreferences).toHaveBeenCalledWith(testUserId);
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/notifications/preferences');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Missing token');
    });

    test('should handle service errors', async () => {
      mockNotificationService.getUserPreferences.mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .get('/api/notifications/preferences')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to get preferences');
    });
  });

  describe('PUT /preferences', () => {
    const updatedPreferences = {
      challengesEnabled: false,
      matchesEnabled: true,
      systemEnabled: true,
      quietHoursStart: '23:00',
      quietHoursEnd: '07:00'
    };

    beforeEach(() => {
      mockNotificationService.updatePreferences.mockResolvedValue(updatedPreferences);
    });

    test('should update user preferences', async () => {
      const requestData = {
        challenges: false,
        matches: true,
        system: true,
        quietHours: {
          start: '23:00',
          end: '07:00'
        }
      };

      const response = await request(app)
        .put('/api/notifications/preferences')
        .set('Authorization', `Bearer ${validToken}`)
        .send(requestData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Preferences updated');
      expect(response.body.preferences).toEqual({
        challenges: false,
        matches: true,
        system: true,
        quietHours: {
          start: '23:00',
          end: '07:00'
        }
      });
      
      expect(mockNotificationService.updatePreferences).toHaveBeenCalledWith(
        testUserId,
        {
          challenges: false,
          matches: true,
          system: true,
          quietHours: {
            start: '23:00',
            end: '07:00'
          }
        }
      );
    });

    test('should use defaults for missing preferences', async () => {
      const requestData = {
        challenges: false
        // matches and system not provided, should default to true
      };

      await request(app)
        .put('/api/notifications/preferences')
        .set('Authorization', `Bearer ${validToken}`)
        .send(requestData);

      expect(mockNotificationService.updatePreferences).toHaveBeenCalledWith(
        testUserId,
        {
          challenges: false,
          matches: true, // Default
          system: true,  // Default
          quietHours: undefined
        }
      );
    });

    test('should validate quiet hours start format', async () => {
      const requestData = {
        quietHours: {
          start: '25:00' // Invalid format
        }
      };

      const response = await request(app)
        .put('/api/notifications/preferences')
        .set('Authorization', `Bearer ${validToken}`)
        .send(requestData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid quiet hours start format (use HH:MM)');
    });

    test('should validate quiet hours end format', async () => {
      const requestData = {
        quietHours: {
          start: '22:00',
          end: '8:00' // Should be 08:00
        }
      };

      const response = await request(app)
        .put('/api/notifications/preferences')
        .set('Authorization', `Bearer ${validToken}`)
        .send(requestData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid quiet hours end format (use HH:MM)');
    });

    test('should allow valid quiet hours formats', async () => {
      const requestData = {
        quietHours: {
          start: '22:30',
          end: '08:15'
        }
      };

      const response = await request(app)
        .put('/api/notifications/preferences')
        .set('Authorization', `Bearer ${validToken}`)
        .send(requestData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .put('/api/notifications/preferences')
        .send({ challenges: false });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Missing token');
    });

    test('should handle service errors', async () => {
      mockNotificationService.updatePreferences.mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .put('/api/notifications/preferences')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ challenges: false });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to update preferences');
    });
  });

  describe('Authentication Middleware', () => {
    test('should extract token from Authorization header', async () => {
      mockNotificationService.getUserPreferences.mockResolvedValue({});

      const response = await request(app)
        .get('/api/notifications/preferences')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
    });

    test('should extract token from cookies', async () => {
      mockNotificationService.getUserPreferences.mockResolvedValue({});

      const response = await request(app)
        .get('/api/notifications/preferences')
        .set('Cookie', `token=${validToken}`);

      expect(response.status).toBe(200);
    });

    test('should handle missing token', async () => {
      const response = await request(app)
        .get('/api/notifications/preferences');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Missing token');
    });

    test('should handle invalid token', async () => {
      const response = await request(app)
        .get('/api/notifications/preferences')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid token');
    });

    test('should handle expired token', async () => {
      const expiredToken = jwt.sign(
        { userId: testUserId, email: 'test@example.com' },
        JWT_SECRET,
        { expiresIn: '-1h' }
      );

      const response = await request(app)
        .get('/api/notifications/preferences')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid token');
    });

    test('should set user compatibility properties', async () => {
      mockNotificationService.getUserPreferences.mockImplementation((userId) => {
        // Verify both req.userId and req.user.id are set
        expect(userId).toBe(testUserId);
        return Promise.resolve({});
      });

      await request(app)
        .get('/api/notifications/preferences')
        .set('Authorization', `Bearer ${validToken}`);

      expect(mockNotificationService.getUserPreferences).toHaveBeenCalledWith(testUserId);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle empty request bodies gracefully', async () => {
      mockNotificationService.updatePreferences.mockResolvedValue({
        challengesEnabled: true,
        matchesEnabled: true,
        systemEnabled: true
      });

      const response = await request(app)
        .put('/api/notifications/preferences')
        .set('Authorization', `Bearer ${validToken}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should handle partial quiet hours objects', async () => {
      const requestData = {
        quietHours: {
          start: '22:00'
          // end is missing - should not cause validation error
        }
      };

      const response = await request(app)
        .put('/api/notifications/preferences')
        .set('Authorization', `Bearer ${validToken}`)
        .send(requestData);

      expect(response.status).toBe(200);
    });

    test('should handle malformed JSON in requests', async () => {
      const response = await request(app)
        .post('/api/notifications/subscribe')
        .set('Authorization', `Bearer ${validToken}`)
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}');

      expect(response.status).toBe(400);
    });
  });

  describe('Service Integration', () => {
    test('should pass correct parameters to notification service methods', async () => {
      const subscription = {
        endpoint: 'https://test.com/endpoint',
        keys: { p256dh: 'key1', auth: 'key2' }
      };

      await request(app)
        .post('/api/notifications/subscribe')
        .set('Authorization', `Bearer ${validToken}`)
        .set('User-Agent', 'Test Agent')
        .send({ subscription });

      expect(mockNotificationService.createSubscription).toHaveBeenCalledWith(
        testUserId,
        subscription,
        'Test Agent'
      );
    });

    test('should handle service method return values correctly', async () => {
      mockNotificationService.createSubscription.mockResolvedValue({
        existing: false,
        subscription: { id: 'new-sub-123' },
        additionalData: 'should be spread'
      });

      const response = await request(app)
        .post('/api/notifications/subscribe')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ 
          subscription: { 
            endpoint: 'test', 
            keys: { p256dh: 'key', auth: 'auth' } 
          } 
        });

      expect(response.body.additionalData).toBe('should be spread');
    });
  });
});