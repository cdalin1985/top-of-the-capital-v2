/**
 * Notification Service Unit Tests
 */

// Mock web-push
const mockWebPush = {
  setVapidDetails: jest.fn(),
  sendNotification: jest.fn()
};

jest.mock('web-push', () => mockWebPush);

// Mock Prisma
const mockPrisma = {
  pushSubscription: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn()
  },
  notificationPreferences: {
    findUnique: jest.fn(),
    create: jest.fn(),
    upsert: jest.fn()
  },
  notificationHistory: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    updateMany: jest.fn()
  }
};

jest.mock('../../../generated/prisma', () => ({
  PrismaClient: jest.fn(() => mockPrisma)
}));

// Silence winston
jest.mock('winston', () => ({
  createLogger: () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn(), transports: [] }),
  format: { combine: jest.fn(), timestamp: jest.fn(), printf: jest.fn() },
  transports: { Console: jest.fn() }
}));

const NotificationService = require('../../../lib/notification-service');

describe('NotificationService', () => {
  let service;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NotificationService();
  });

  test('getVapidPublicKey returns env value', () => {
    process.env.VAPID_PUBLIC_KEY = 'pubkey';
    expect(service.getVapidPublicKey()).toBe('pubkey');
  });

  test('createSubscription creates new or returns existing', async () => {
    // Not existing case
    mockPrisma.pushSubscription.findUnique.mockResolvedValue(null);
    mockPrisma.pushSubscription.create.mockResolvedValue({ id: 'sub1' });
    const sub = { endpoint: 'e1', keys: { p256dh: 'k1', auth: 'a1' } };

    const resNew = await service.createSubscription('user1', sub, 'UA');
    expect(resNew).toEqual({ success: true, new: true });

    // Existing case
    mockPrisma.pushSubscription.findUnique.mockResolvedValue({ id: 'sub1', endpoint: 'e1' });
    const resExisting = await service.createSubscription('user1', sub, 'UA');
    expect(resExisting).toEqual({ success: true, existing: true });
  });

  test('removeSubscription returns true on success and false on error', async () => {
    mockPrisma.pushSubscription.deleteMany.mockResolvedValue({ count: 1 });
    expect(await service.removeSubscription('u', 'e')).toBe(true);

    mockPrisma.pushSubscription.deleteMany.mockRejectedValue(new Error('fail'));
    expect(await service.removeSubscription('u', 'e')).toBe(false);
  });

  test('updatePreferences upserts and returns updated prefs', async () => {
    const updated = {
      userId: 'u',
      challengesEnabled: false,
      matchesEnabled: true,
      systemEnabled: true,
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00'
    };
    mockPrisma.notificationPreferences.upsert.mockResolvedValue(updated);

    const res = await service.updatePreferences('u', {
      challenges: false,
      matches: true,
      system: true,
      quietHours: { start: '22:00', end: '07:00' }
    });

    expect(res).toBe(updated);
    expect(mockPrisma.notificationPreferences.upsert).toHaveBeenCalled();
  });

  test('getNotificationHistory returns records with pagination', async () => {
    mockPrisma.notificationHistory.findMany.mockResolvedValue([{ id: 'n1' }]);
    mockPrisma.notificationHistory.count.mockResolvedValue(10);

    const res = await service.getNotificationHistory('u', 2, 3);
    expect(res.notifications.length).toBe(1);
    expect(res.pagination).toEqual({ page: 2, limit: 3, total: 10, pages: Math.ceil(10 / 3) });
  });

  test('markAsRead returns true on success and false on error', async () => {
    mockPrisma.notificationHistory.updateMany.mockResolvedValue({ count: 1 });
    expect(await service.markAsRead('u', 'n')).toBe(true);

    mockPrisma.notificationHistory.updateMany.mockRejectedValue(new Error('oops'));
    expect(await service.markAsRead('u', 'n')).toBe(false);
  });

  test('sendNotification returns early when no subscriptions', async () => {
    mockPrisma.pushSubscription.findMany.mockResolvedValue([]);
    const res = await service.sendNotification('u', { title: 't', body: 'b', type: 'system' });
    expect(res).toEqual({ success: false, reason: 'no_subscriptions' });
  });

  test('sendNotification blocked by user preferences (quiet hours or disabled)', async () => {
    mockPrisma.pushSubscription.findMany.mockResolvedValue([{ id: 's1', endpoint: 'e', p256dh: 'k', auth: 'a' }]);
    mockPrisma.notificationPreferences.findUnique.mockResolvedValue({
      challengesEnabled: true,
      matchesEnabled: true,
      systemEnabled: false, // blocks system type
      quietHoursStart: null,
      quietHoursEnd: null
    });

    const res = await service.sendNotification('u', { title: 't', body: 'b', type: 'system' });
    expect(res).toEqual({ success: false, reason: 'user_preferences' });
  });

  test('sendNotification delivers successfully and records history', async () => {
    mockPrisma.pushSubscription.findMany.mockResolvedValue([{ id: 's1', endpoint: 'e', p256dh: 'k', auth: 'a' }]);
    mockPrisma.notificationPreferences.findUnique.mockResolvedValue({
      challengesEnabled: true,
      matchesEnabled: true,
      systemEnabled: true,
      quietHoursStart: null,
      quietHoursEnd: null
    });
    mockWebPush.sendNotification.mockResolvedValue({ statusCode: 201 });
    mockPrisma.notificationHistory.create.mockResolvedValue({ id: 'h1' });

    const res = await service.sendNotification('u', { title: 't', body: 'b', type: 'system' });
    expect(res.success).toBe(true);
    expect(res.delivered).toBe(1);
    expect(mockPrisma.notificationHistory.create).toHaveBeenCalled();
  });

  test('sendToSubscription removes expired subscription on 410', async () => {
    const sub = { id: 's1', endpoint: 'e', p256dh: 'k', auth: 'a' };
    const error = new Error('Gone');
    error.statusCode = 410;
    mockWebPush.sendNotification.mockRejectedValue(error);

    await expect(service.sendToSubscription(sub, { title: 't', body: 'b' })).rejects.toThrow('Gone');
    expect(mockPrisma.pushSubscription.delete).toHaveBeenCalledWith({ where: { id: 's1' } });
  });
});