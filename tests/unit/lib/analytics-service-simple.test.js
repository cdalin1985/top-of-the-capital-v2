/**
 * Analytics Service (Simple) Unit Tests
 */

const jwt = require('jsonwebtoken'); // kept to align environment; not used directly

// Mock PrismaClient used by analytics service
const mockPrisma = {
  user: {
    count: jest.fn(),
    findMany: jest.fn()
  },
  challenge: {
    count: jest.fn(),
    findMany: jest.fn()
  },
  match: {
    count: jest.fn()
  }
};

jest.mock('../../../generated/prisma', () => ({
  PrismaClient: jest.fn(() => mockPrisma)
}));

// Optionally mock winston to silence logs
jest.mock('winston', () => ({
  createLogger: () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn(), transports: [] }),
  format: {
    combine: jest.fn(),
    timestamp: jest.fn(),
    printf: jest.fn()
  },
  transports: { Console: jest.fn() }
}));

const AnalyticsService = require('../../../lib/analytics-service-simple');

function setFixedNow(iso) {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(iso));
}

describe('AnalyticsService (simple)', () => {
  let service;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    service = new AnalyticsService();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('calculateLeagueHealthSimple computes capped score and breakdown', async () => {
    mockPrisma.user.count.mockResolvedValue(12); // >10
    mockPrisma.challenge.count.mockResolvedValue(6); // >5
    mockPrisma.match.count.mockResolvedValue(4); // >3

    const result = await service.calculateLeagueHealthSimple();
    expect(result.score).toBe(100); // 50 + 20 + 15 + 15 capped at 100
    expect(result.trend).toBe('stable');
    expect(result.breakdown).toBeDefined();
  });

  test('getActivePlayersSimple returns derived current/previous and breakdown', async () => {
    mockPrisma.user.count.mockResolvedValue(10);
    mockPrisma.challenge.count.mockResolvedValue(3); // recent challenges

    const result = await service.getActivePlayersSimple();
    expect(result.current).toBe(6);
    expect(result.previous).toBe(5);
    expect(result.breakdown).toBeDefined();
  });

  test('getPendingChallengesInfo computes urgent based on age', async () => {
    setFixedNow('2025-01-10T00:00:00Z');
    mockPrisma.challenge.findMany.mockResolvedValue([
      {
        id: 'ch1',
        discipline: 'Eight Ball',
        createdAt: new Date('2025-01-05T00:00:00Z'), // 5 days ago → urgent
        creator: { displayName: 'A', email: 'a@x.com' },
        targetUser: { displayName: 'B', email: 'b@x.com' }
      },
      {
        id: 'ch2',
        discipline: 'Nine Ball',
        createdAt: new Date('2025-01-09T00:00:00Z'), // 1 day ago → not urgent
        creator: { displayName: 'A2', email: 'a2@x.com' },
        targetUser: { displayName: 'B2', email: 'b2@x.com' }
      }
    ]);

    const result = await service.getPendingChallengesInfo();
    expect(result.count).toBe(2);
    expect(result.urgent).toBe(1);
    expect(Array.isArray(result.details)).toBe(true);
  });

  test('getMatchCompletionSimple returns rate and counts', async () => {
    mockPrisma.match.count
      .mockResolvedValueOnce(10) // total
      .mockResolvedValueOnce(4); // completed

    const result = await service.getMatchCompletionSimple();
    expect(result.rate).toBe(40.0);
    expect(result.completedThisPeriod).toBe(4);
  });

  test('getPlayerSegments groups users by age window and formats percentages', async () => {
    setFixedNow('2025-04-01T00:00:00Z');
    mockPrisma.user.findMany.mockResolvedValue([
      { id: 'u1', displayName: 'New', email: 'n@x.com', createdAt: new Date('2025-03-15T00:00:00Z') }, // 17 days
      { id: 'u2', displayName: 'Mid', email: 'm@x.com', createdAt: new Date('2025-02-10T00:00:00Z') }, // 50 days
      { id: 'u3', displayName: 'Old', email: 'o@x.com', createdAt: new Date('2024-10-01T00:00:00Z') } // > 90 days
    ]);

    const out = await service.getPlayerSegments();
    expect(out.totalPlayers).toBe(3);
    expect(out.segments.highly_active.count).toBe(1);
    expect(out.segments.moderately_active.count).toBe(1);
    expect(out.segments.at_risk.count).toBe(1);
    expect(Array.isArray(out.detailedPlayers)).toBe(true);
  });

  test('getOverviewMetrics composes metrics', async () => {
    mockPrisma.user.count.mockResolvedValue(1);
    mockPrisma.challenge.count.mockResolvedValue(0);
    mockPrisma.match.count.mockResolvedValue(0);
    mockPrisma.challenge.findMany.mockResolvedValue([]);

    const res = await service.getOverviewMetrics('7d', false);
    expect(res.period).toBe('7d');
    expect(res.leagueHealth).toBeDefined();
    expect(res.activePlayers).toBeDefined();
    expect(res.pendingChallenges).toBeDefined();
    expect(res.matchCompletion).toBeDefined();
  });
});