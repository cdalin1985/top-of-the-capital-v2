/**
 * Analytics API Routes
 * Handles all analytics dashboard endpoints for admin users
 * Version 1.0 - Created 2025-09-15
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const AnalyticsService = require('../lib/analytics-service-simple');
const securityConfig = require('../config/security');

// Initialize analytics service
const analyticsService = new AnalyticsService();

// Auth middleware for admin access
function adminAuthMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  let token = header.startsWith('Bearer ') ? header.slice(7) : header;
  if (!token && req.cookies?.token) {
    token = req.cookies.token;
  }
  if (!token && req.headers?.cookie) {
    // Fallback cookie parsing when cookie-parser is not used
    const parts = req.headers.cookie.split(';').map(s => s.trim());
    for (const p of parts) {
      const [k, ...rest] = p.split('=');
      if (k === 'token') {
        token = decodeURIComponent(rest.join('='));
        break;
      }
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  try {
    const { secret } = securityConfig.getJWTConfig();
    const payload = jwt.verify(token, secret); // Do not enforce issuer/audience for compatibility
    req.userId = payload.userId;

    // TODO: Implement proper admin check - for now, allow all authenticated users
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid authentication token'
    });
  }
}

/**
 * GET /api/analytics/overview/metrics
 * Get key dashboard metrics for overview page
 */
router.get('/overview/metrics', adminAuthMiddleware, async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    const refreshParam = typeof req.query.refresh === 'string' ? req.query.refresh : '';
    const refresh = ['true', '1', 'yes', 'on'].includes(String(refreshParam).toLowerCase());

    // Validate period parameter
    const validPeriods = ['24h', '7d', '30d', '90d', '1y'];
    if (!validPeriods.includes(period)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid period. Must be one of: 24h, 7d, 30d, 90d, 1y'
      });
    }

    const metrics = await analyticsService.getOverviewMetrics(period, refresh);

    res.json({
      success: true,
      data: metrics,
      cached: !refresh
    });
  } catch (error) {
    console.error('Error getting overview metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve overview metrics'
    });
  }
});

/**
 * GET /api/analytics/players/segments
 * Get player segmentation analysis
 */
router.get('/players/segments', adminAuthMiddleware, async (req, res) => {
  try {
    const segments = await analyticsService.getPlayerSegments();

    res.json({
      success: true,
      data: segments
    });
  } catch (error) {
    console.error('Error getting player segments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve player segments'
    });
  }
});

/**
 * GET /api/analytics/players/list
 * Get detailed player list with analytics data
 */
router.get('/players/list', adminAuthMiddleware, async (req, res) => {
  try {
    const { segment, search, sortBy = 'lastActive', sortOrder = 'desc' } = req.query;

    const segments = await analyticsService.getPlayerSegments();
    let players = segments.detailedPlayers || [];

    // Filter by segment
    if (segment && segment !== 'all') {
      players = players.filter(p => p.activitySegment === segment);
    }

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      players = players.filter(
        p =>
          (p.displayName && p.displayName.toLowerCase().includes(searchLower)) ||
          p.email.toLowerCase().includes(searchLower)
      );
    }

    // Sort players
    players.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      if (sortBy === 'lastActive') {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      }

      if (sortOrder === 'desc') {
        return bVal > aVal ? 1 : -1;
      } else {
        return aVal > bVal ? 1 : -1;
      }
    });

    // Format for display
    const formattedPlayers = players.map(p => ({
      id: p.id,
      name: p.displayName || p.email,
      email: p.email,
      lastActive: p.lastActive,
      daysSinceActive: Math.floor(
        (Date.now() - new Date(p.lastActive).getTime()) / (1000 * 60 * 60 * 24)
      ),
      challengeCount: p.challengeCount || 0,
      matchCount: p.matchCount || 0,
      segment: p.activitySegment,
      isAtRisk: p.activitySegment === 'at_risk',
      joinDate: p.joinDate
    }));

    res.json({
      success: true,
      data: {
        players: formattedPlayers,
        total: formattedPlayers.length,
        filters: {
          segment,
          search,
          sortBy,
          sortOrder
        }
      }
    });
  } catch (error) {
    console.error('Error getting player list:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve player list'
    });
  }
});

/**
 * GET /api/analytics/competition/challenge-flow
 * Get challenge conversion funnel metrics
 */
router.get('/competition/challenge-flow', adminAuthMiddleware, async (req, res) => {
  try {
    const { period = '7d' } = req.query;

    // For now, return mock data structure - will implement full calculation later
    const mockFunnelData = {
      funnel: {
        created: { count: 23, percentage: 100 },
        accepted: { count: 18, percentage: 78.3, conversionRate: 78.3 },
        scheduled: { count: 15, percentage: 65.2, conversionRate: 83.3 },
        completed: { count: 12, percentage: 52.2, conversionRate: 80.0 }
      },
      avgTimeToAccept: '1.2 days',
      avgTimeToComplete: '3.4 days',
      period
    };

    res.json({
      success: true,
      data: mockFunnelData
    });
  } catch (error) {
    console.error('Error getting challenge flow:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve challenge flow metrics'
    });
  }
});

/**
 * GET /api/analytics/activity-feed
 * Get recent activity feed for dashboard
 */
router.get('/activity-feed', adminAuthMiddleware, async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    // Get recent challenges and matches
    const recentChallenges = await analyticsService.prisma.challenge.findMany({
      take: parseInt(limit) / 2,
      orderBy: { createdAt: 'desc' },
      include: {
        creator: { select: { displayName: true, email: true } },
        targetUser: { select: { displayName: true, email: true } }
      }
    });

    const recentMatches = await analyticsService.prisma.match.findMany({
      where: { status: 'completed' },
      take: parseInt(limit) / 2,
      orderBy: { completedAt: 'desc' },
      include: {
        player1: { select: { displayName: true, email: true } },
        player2: { select: { displayName: true, email: true } },
        winner: { select: { displayName: true, email: true } }
      }
    });

    // Format activity feed
    const activities = [];

    recentChallenges.forEach(challenge => {
      activities.push({
        id: `challenge-${challenge.id}`,
        type: 'challenge',
        message: `${challenge.creator.displayName || challenge.creator.email} challenged ${challenge.targetUser.displayName || challenge.targetUser.email}`,
        details: `${challenge.discipline}, first to ${challenge.gamesToWin}`,
        timestamp: challenge.createdAt,
        status: challenge.status
      });
    });

    recentMatches.forEach(match => {
      if (match.winner) {
        activities.push({
          id: `match-${match.id}`,
          type: 'match_completed',
          message: `${match.winner.displayName || match.winner.email} defeated ${match.player1Id === match.winnerId ? match.player2.displayName || match.player2.email : match.player1.displayName || match.player1.email}`,
          details: `Match completed at ${match.venue || 'unknown venue'}`,
          timestamp: match.completedAt,
          status: 'completed'
        });
      }
    });

    // Sort by timestamp and limit
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const limitedActivities = activities.slice(0, parseInt(limit));

    res.json({
      success: true,
      data: {
        activities: limitedActivities,
        total: limitedActivities.length
      }
    });
  } catch (error) {
    console.error('Error getting activity feed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve activity feed'
    });
  }
});

/**
 * POST /api/analytics/cache/invalidate
 * Invalidate analytics cache (admin utility)
 */
router.post('/cache/invalidate', adminAuthMiddleware, async (req, res) => {
  try {
    const { pattern = 'overview' } = req.body;

    await analyticsService.invalidateCache(pattern);

    res.json({
      success: true,
      message: `Cache invalidated for pattern: ${pattern}`
    });
  } catch (error) {
    console.error('Error invalidating cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to invalidate cache'
    });
  }
});

/**
 * GET /api/analytics/health-check
 * Analytics service health check
 */
router.get('/health-check', adminAuthMiddleware, (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'analytics',
    version: '1.0.0'
  });
});

module.exports = router;
