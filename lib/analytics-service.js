/**
 * Capital Ladder Analytics Service
 * Handles all analytics calculations, caching, and data aggregation
 * Version 1.0 - Created 2025-09-15
 */

const { PrismaClient } = require('../generated/prisma');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => `${timestamp} ${level}: ${message}`)
  ),
  transports: [new winston.transports.Console()]
});

class AnalyticsService {
  constructor() {
    this.prisma = new PrismaClient();
    this.cache = new Map(); // In-memory cache for hot data
    this.CACHE_TTL = {
      SHORT: 5 * 60 * 1000, // 5 minutes
      MEDIUM: 30 * 60 * 1000, // 30 minutes
      LONG: 60 * 60 * 1000 // 1 hour
    };
  }

  /**
   * Get key dashboard metrics for overview page
   */
  async getOverviewMetrics(period = '30d', refresh = false) {
    const cacheKey = `overview_metrics_${period}`;

    if (!refresh) {
      const cached = await this.getCachedData(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      const [leagueHealth, activePlayers, pendingChallenges, matchCompletion] = await Promise.all([
        this.calculateLeagueHealth(period),
        this.getActivePlayersBreakdown(period),
        this.getPendingChallengesInfo(),
        this.getMatchCompletionStats(period)
      ]);

      const metrics = {
        leagueHealth,
        activePlayers,
        pendingChallenges,
        matchCompletion,
        generatedAt: new Date().toISOString(),
        period
      };

      await this.setCachedData(cacheKey, metrics, this.CACHE_TTL.SHORT);
      return metrics;
    } catch (error) {
      logger.error('Error calculating overview metrics:', error);
      throw error;
    }
  }

  /**
   * Calculate league health score (0-100)
   */
  async calculateLeagueHealth(period = '30d') {
    try {
      const metrics = await this.getBaseHealthMetrics(period);

      let healthScore = 0;

      // Activity Factor (40% of score)
      const activityScore = Math.min(metrics.activePlayerRate * 100, 100);
      healthScore += activityScore * 0.4;

      // Engagement Factor (30% of score)
      const engagementScore = Math.min(metrics.challengeAcceptanceRate, 100);
      healthScore += engagementScore * 0.3;

      // Completion Factor (20% of score)
      const completionScore = Math.min(metrics.matchCompletionRate, 100);
      healthScore += completionScore * 0.2;

      // Growth Factor (10% of score)
      const growthScore = Math.max(0, Math.min(metrics.playerGrowthRate * 10, 100));
      healthScore += growthScore * 0.1;

      const score = Math.round(healthScore);
      const trend = this.calculateTrend(score, period);

      return {
        score,
        trend,
        factors: this.getHealthFactors(score),
        breakdown: {
          activity: Math.round(activityScore),
          engagement: Math.round(engagementScore),
          completion: Math.round(completionScore),
          growth: Math.round(growthScore)
        }
      };
    } catch (error) {
      logger.error('Error calculating league health:', error);
      return { score: 0, trend: 'unknown', factors: ['error'], breakdown: {} };
    }
  }

  /**
   * Get base metrics for health score calculation
   */
  async getBaseHealthMetrics(period) {
    const days = this.parsePeriodToDays(period);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Get total users and active users
    const totalUsers = await this.prisma.user.count();
    const activeUsers = await this.prisma.$queryRaw`
      SELECT COUNT(DISTINCT u.id) as count
      FROM User u
      WHERE u.id IN (
        SELECT DISTINCT c.creatorId FROM Challenge c WHERE c.createdAt >= ${startDate}
        UNION
        SELECT DISTINCT c.targetUserId FROM Challenge c WHERE c.createdAt >= ${startDate}
        UNION
        SELECT DISTINCT m.player1Id FROM Match m WHERE m.createdAt >= ${startDate}
        UNION
        SELECT DISTINCT m.player2Id FROM Match m WHERE m.createdAt >= ${startDate}
      )
    `;

    // Challenge metrics
    const challengeStats = await this.prisma.$queryRaw`
      SELECT 
        COUNT(*) as totalChallenges,
        SUM(CASE WHEN status != 'pending' THEN 1 ELSE 0 END) as acceptedChallenges
      FROM Challenge 
      WHERE createdAt >= ${startDate}
    `;

    // Match completion metrics
    const matchStats = await this.prisma.$queryRaw`
      SELECT 
        COUNT(*) as totalMatches,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completedMatches
      FROM Match 
      WHERE createdAt >= ${startDate}
    `;

    // Growth metrics
    const previousPeriodStart = new Date(startDate.getTime() - days * 24 * 60 * 60 * 1000);
    const previousActiveUsers = await this.prisma.$queryRaw`
      SELECT COUNT(DISTINCT u.id) as count
      FROM User u
      WHERE u.id IN (
        SELECT DISTINCT c.creatorId FROM Challenge c WHERE c.createdAt >= ${previousPeriodStart} AND c.createdAt < ${startDate}
        UNION
        SELECT DISTINCT c.targetUserId FROM Challenge c WHERE c.createdAt >= ${previousPeriodStart} AND c.createdAt < ${startDate}
        UNION
        SELECT DISTINCT m.player1Id FROM Match m WHERE m.createdAt >= ${previousPeriodStart} AND m.createdAt < ${startDate}
        UNION
        SELECT DISTINCT m.player2Id FROM Match m WHERE m.createdAt >= ${previousPeriodStart} AND m.createdAt < ${startDate}
      )
    `;

    const activePlayerRate = totalUsers > 0 ? activeUsers[0].count / totalUsers : 0;
    const challengeAcceptanceRate =
      challengeStats[0].totalChallenges > 0
        ? (challengeStats[0].acceptedChallenges / challengeStats[0].totalChallenges) * 100
        : 0;
    const matchCompletionRate =
      matchStats[0].totalMatches > 0
        ? (matchStats[0].completedMatches / matchStats[0].totalMatches) * 100
        : 0;
    const playerGrowthRate =
      previousActiveUsers[0].count > 0
        ? (activeUsers[0].count - previousActiveUsers[0].count) / previousActiveUsers[0].count
        : 0;

    return {
      activePlayerRate,
      challengeAcceptanceRate,
      matchCompletionRate,
      playerGrowthRate
    };
  }

  /**
   * Get player segmentation data
   */
  async getPlayerSegments() {
    const cacheKey = 'player_segments';
    const cached = await this.getCachedData(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      // Get all users first
      const users = await this.prisma.user.findMany({
        select: {
          id: true,
          displayName: true,
          email: true,
          createdAt: true
        }
      });

      // Get recent challenges and matches to determine last activity
      const recentChallenges = await this.prisma.challenge.findMany({
        where: {
          createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
        },
        select: {
          creatorId: true,
          targetUserId: true,
          createdAt: true
        }
      });

      const recentMatches = await this.prisma.match.findMany({
        where: {
          createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
        },
        select: {
          player1Id: true,
          player2Id: true,
          createdAt: true
        }
      });

      // Process data to create player segments
      const players = users.map(user => {
        const activities = [];

        // Add challenge activities
        recentChallenges.forEach(challenge => {
          if (challenge.creatorId === user.id || challenge.targetUserId === user.id) {
            activities.push(challenge.createdAt);
          }
        });

        // Add match activities
        recentMatches.forEach(match => {
          if (match.player1Id === user.id || match.player2Id === user.id) {
            activities.push(match.createdAt);
          }
        });

        // Determine last activity
        const lastActive =
          activities.length > 0
            ? new Date(Math.max(...activities.map(d => d.getTime())))
            : user.createdAt;

        // Calculate activity segment
        const daysSinceActive = (Date.now() - lastActive.getTime()) / (1000 * 60 * 60 * 24);
        let activitySegment;
        if (daysSinceActive <= 7) {
          activitySegment = 'highly_active';
        } else if (daysSinceActive <= 30) {
          activitySegment = 'moderately_active';
        } else {
          activitySegment = 'at_risk';
        }

        return {
          id: user.id,
          displayName: user.displayName,
          email: user.email,
          joinDate: user.createdAt,
          lastActive: lastActive,
          challengeCount: activities.length,
          matchCount: recentMatches.filter(m => m.player1Id === user.id || m.player2Id === user.id)
            .length,
          activitySegment
        };
      });

      // Segment the players
      const segments = {
        highly_active: players.filter(p => p.activitySegment === 'highly_active'),
        moderately_active: players.filter(p => p.activitySegment === 'moderately_active'),
        at_risk: players.filter(p => p.activitySegment === 'at_risk')
      };

      const result = {
        segments: {
          highly_active: {
            count: segments.highly_active.length,
            percentage:
              players.length > 0
                ? ((segments.highly_active.length / players.length) * 100).toFixed(1)
                : 0,
            criteria: 'Active within 7 days, 3+ activities',
            trend: 'up' // TODO: Calculate actual trend
          },
          moderately_active: {
            count: segments.moderately_active.length,
            percentage:
              players.length > 0
                ? ((segments.moderately_active.length / players.length) * 100).toFixed(1)
                : 0,
            criteria: 'Active within 30 days, 1-2 activities',
            trend: 'stable' // TODO: Calculate actual trend
          },
          at_risk: {
            count: segments.at_risk.length,
            percentage:
              players.length > 0
                ? ((segments.at_risk.length / players.length) * 100).toFixed(1)
                : 0,
            criteria: 'Inactive 30+ days',
            trend: 'down' // TODO: Calculate actual trend
          }
        },
        totalPlayers: players.length,
        detailedPlayers: players // Include detailed player data
      };

      await this.setCachedData(cacheKey, result, this.CACHE_TTL.MEDIUM);
      return result;
    } catch (error) {
      logger.error('Error calculating player segments:', error);
      throw error;
    }
  }

  /**
   * Get active players breakdown by time period
   */
  async getActivePlayersBreakdown(period = '30d') {
    const currentActive = await this.getActivePlayerCount(period);
    const previousActive = await this.getActivePlayerCount(period, true); // Previous period

    const change =
      previousActive > 0
        ? (((currentActive - previousActive) / previousActive) * 100).toFixed(1)
        : 0;

    const segments = await this.getPlayerSegments();

    return {
      current: currentActive,
      previous: previousActive,
      change: parseFloat(change),
      breakdown: {
        highly_active: segments.segments.highly_active.count,
        moderately_active: segments.segments.moderately_active.count,
        at_risk: segments.segments.at_risk.count
      }
    };
  }

  /**
   * Get pending challenges information
   */
  async getPendingChallengesInfo() {
    const pending = await this.prisma.challenge.findMany({
      where: { status: 'pending' },
      include: { creator: true, targetUser: true }
    });

    const urgent = pending.filter(challenge => {
      const daysSinceCreated = (Date.now() - challenge.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceCreated > 3; // Urgent if older than 3 days
    });

    const avgResponseTime = await this.calculateAverageResponseTime();

    return {
      count: pending.length,
      urgent: urgent.length,
      avgResponseTime: `${avgResponseTime} days`,
      details: pending.map(c => ({
        id: c.id,
        from: c.creator.displayName || c.creator.email,
        to: c.targetUser.displayName || c.targetUser.email,
        discipline: c.discipline,
        daysSinceCreated: Math.floor((Date.now() - c.createdAt.getTime()) / (1000 * 60 * 60 * 24))
      }))
    };
  }

  /**
   * Get match completion statistics
   */
  async getMatchCompletionStats(period = '30d') {
    const days = this.parsePeriodToDays(period);
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const stats = await this.prisma.$queryRaw`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
      FROM Match 
      WHERE createdAt >= ${startDate}
    `;

    const rate = stats[0].total > 0 ? ((stats[0].completed / stats[0].total) * 100).toFixed(1) : 0;
    const trend = await this.calculateCompletionTrend(period);

    return {
      rate: parseFloat(rate),
      trend,
      completedThisPeriod: stats[0].completed,
      totalThisPeriod: stats[0].total
    };
  }

  // Helper methods

  async getActivePlayerCount(period, previous = false) {
    const days = this.parsePeriodToDays(period);
    const offset = previous ? days : 0;
    const startDate = new Date(Date.now() - (days + offset) * 24 * 60 * 60 * 1000);
    const endDate = previous ? new Date(Date.now() - offset * 24 * 60 * 60 * 1000) : new Date();

    const result = await this.prisma.$queryRaw`
      SELECT COUNT(DISTINCT u.id) as count
      FROM User u
      WHERE u.id IN (
        SELECT DISTINCT c.creatorId FROM Challenge c WHERE c.createdAt >= ${startDate} AND c.createdAt < ${endDate}
        UNION
        SELECT DISTINCT c.targetUserId FROM Challenge c WHERE c.createdAt >= ${startDate} AND c.createdAt < ${endDate}
        UNION
        SELECT DISTINCT m.player1Id FROM Match m WHERE m.createdAt >= ${startDate} AND m.createdAt < ${endDate}
        UNION
        SELECT DISTINCT m.player2Id FROM Match m WHERE m.createdAt >= ${startDate} AND m.createdAt < ${endDate}
      )
    `;

    return result[0].count;
  }

  async calculateAverageResponseTime() {
    const responded = await this.prisma.challenge.findMany({
      where: {
        status: { not: 'pending' },
        updatedAt: { not: null }
      },
      select: {
        createdAt: true,
        updatedAt: true
      }
    });

    if (responded.length === 0) {
      return 0;
    }

    const totalHours = responded.reduce((sum, challenge) => {
      const responseTime = challenge.updatedAt.getTime() - challenge.createdAt.getTime();
      return sum + responseTime / (1000 * 60 * 60); // Convert to hours
    }, 0);

    const avgHours = totalHours / responded.length;
    return (avgHours / 24).toFixed(1); // Convert to days
  }

  parsePeriodToDays(period) {
    const periodMap = {
      '24h': 1,
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365
    };
    return periodMap[period] || 30;
  }

  calculateTrend(currentValue, period) {
    // Simplified trend calculation - in production would compare to previous period
    if (currentValue >= 80) {
      return 'up';
    }
    if (currentValue >= 60) {
      return 'stable';
    }
    return 'down';
  }

  getHealthFactors(score) {
    if (score >= 80) {
      return ['high_activity', 'good_completion_rate', 'growing'];
    }
    if (score >= 60) {
      return ['moderate_activity', 'stable_engagement'];
    }
    return ['low_activity', 'needs_attention'];
  }

  async calculateCompletionTrend(period) {
    // Simplified - would compare current vs previous period
    return 'stable';
  }

  // Cache management methods

  async getCachedData(key) {
    try {
      // Check memory cache first
      if (this.cache.has(key)) {
        const cached = this.cache.get(key);
        if (cached.expires > Date.now()) {
          return cached.data;
        } else {
          this.cache.delete(key);
        }
      }

      // Check database cache
      const dbCached = await this.prisma.analyticsCache.findUnique({
        where: { cacheKey: key }
      });

      if (dbCached && dbCached.expiresAt > new Date()) {
        const data = JSON.parse(dbCached.data);
        // Promote to memory cache
        this.cache.set(key, {
          data,
          expires: dbCached.expiresAt.getTime()
        });
        return data;
      }

      return null;
    } catch (error) {
      logger.error('Error retrieving cached data:', error);
      return null;
    }
  }

  async setCachedData(key, data, ttl) {
    try {
      const expiresAt = new Date(Date.now() + ttl);

      // Store in memory cache
      this.cache.set(key, { data, expires: expiresAt.getTime() });

      // Store in database cache for persistence
      await this.prisma.analyticsCache.upsert({
        where: { cacheKey: key },
        update: {
          data: JSON.stringify(data),
          expiresAt,
          lastUpdated: new Date()
        },
        create: {
          cacheKey: key,
          data: JSON.stringify(data),
          expiresAt,
          lastUpdated: new Date()
        }
      });
    } catch (error) {
      logger.error('Error setting cached data:', error);
    }
  }

  async invalidateCache(keyPattern) {
    try {
      // Clear memory cache
      for (const key of this.cache.keys()) {
        if (key.includes(keyPattern)) {
          this.cache.delete(key);
        }
      }

      // Clear database cache
      await this.prisma.analyticsCache.deleteMany({
        where: {
          cacheKey: {
            contains: keyPattern
          }
        }
      });
    } catch (error) {
      logger.error('Error invalidating cache:', error);
    }
  }
}

module.exports = AnalyticsService;
