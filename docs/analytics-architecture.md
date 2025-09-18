# League Analytics Dashboard - System Architecture Document

**Project:** Capital Ladder App - Analytics Dashboard  
**Version:** 1.0  
**Date:** 2025-09-15  
**Phase:** System Architecture

---

## 🏗️ Architecture Overview

The League Analytics Dashboard extends the existing Capital Ladder App
architecture with a dedicated analytics layer that aggregates, processes, and
visualizes league data. The system follows a microservices pattern within the
monolithic structure, ensuring separation of concerns while maintaining
performance.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Layer                           │
├─────────────────────────────────────────────────────────────┤
│ Analytics Dashboard UI │ Chart.js │ Real-time Updates       │
└─────────────────────────────────────────────────────────────┘
                                ↓ HTTP/WebSocket
┌─────────────────────────────────────────────────────────────┐
│                 Application Layer                           │
├─────────────────────────────────────────────────────────────┤
│ Analytics API Routes │ Analytics Service │ Alert Manager    │
└─────────────────────────────────────────────────────────────┘
                                ↓ Prisma ORM
┌─────────────────────────────────────────────────────────────┐
│                   Data Layer                               │
├─────────────────────────────────────────────────────────────┤
│ Existing Tables │ Analytics Views │ Computed Metrics        │
│ (Users, Matches, │ (Aggregations)  │ (Cache Layer)           │
│ Challenges)     │                 │                         │
└─────────────────────────────────────────────────────────────┘
                                ↓ Background Jobs
┌─────────────────────────────────────────────────────────────┐
│              Analytics Processing Layer                      │
├─────────────────────────────────────────────────────────────┤
│ Metric Calculators │ Data Aggregators │ Alert Processors    │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗄️ Database Schema Extensions

### New Analytics Tables

#### AnalyticsMetrics

```sql
CREATE TABLE AnalyticsMetrics (
  id                    String      @id @default(cuid())
  metricType           String      -- 'player_activity', 'challenge_flow', 'match_completion'
  metricName           String      -- 'weekly_active_users', 'challenge_acceptance_rate'
  value                Float       -- The calculated metric value
  metadata             Json?       -- Additional context data
  periodStart          DateTime    -- Start of measurement period
  periodEnd            DateTime    -- End of measurement period
  calculatedAt         DateTime    @default(now())

  @@unique([metricType, metricName, periodStart])
  @@index([metricType, periodStart])
)
```

#### AnalyticsAlerts

```sql
CREATE TABLE AnalyticsAlerts (
  id                    String      @id @default(cuid())
  alertType            String      -- 'player_inactivity', 'low_engagement', 'system_issue'
  severity             String      -- 'info', 'warning', 'critical'
  title                String      -- Alert display title
  message              String      -- Detailed alert message
  data                 Json?       -- Alert-specific data
  triggeredAt          DateTime    @default(now())
  acknowledgedAt       DateTime?   -- When admin acknowledged the alert
  acknowledgedBy       String?     -- User ID who acknowledged
  resolvedAt           DateTime?   -- When alert was resolved

  @@index([alertType, severity, triggeredAt])
)
```

#### AnalyticsCache

```sql
CREATE TABLE AnalyticsCache (
  id                    String      @id @default(cuid())
  cacheKey             String      @unique -- Unique identifier for cached data
  data                 Json        -- Cached analytics data
  expiresAt            DateTime    -- Cache expiration time
  lastUpdated          DateTime    @default(now())

  @@index([cacheKey, expiresAt])
)
```

### Database Views (Virtual Tables)

#### PlayerActivityView

```sql
CREATE VIEW PlayerActivityView AS
SELECT
  u.id as userId,
  u.displayName,
  u.email,
  u.createdAt as joinDate,
  COALESCE(recent_activity.lastActive, u.createdAt) as lastActive,
  COALESCE(challenge_stats.challengesSent, 0) as challengesSent,
  COALESCE(challenge_stats.challengesReceived, 0) as challengesReceived,
  COALESCE(match_stats.matchesPlayed, 0) as matchesPlayed,
  COALESCE(match_stats.matchesWon, 0) as matchesWon,
  CASE
    WHEN recent_activity.lastActive >= datetime('now', '-7 days') THEN 'highly_active'
    WHEN recent_activity.lastActive >= datetime('now', '-30 days') THEN 'moderately_active'
    ELSE 'at_risk'
  END as activitySegment
FROM User u
LEFT JOIN (
  SELECT userId, MAX(createdAt) as lastActive
  FROM (
    SELECT creatorId as userId, createdAt FROM Challenge
    UNION ALL
    SELECT targetUserId as userId, createdAt FROM Challenge
    UNION ALL
    SELECT player1Id as userId, createdAt FROM Match
    UNION ALL
    SELECT player2Id as userId, createdAt FROM Match
  ) activities
  GROUP BY userId
) recent_activity ON u.id = recent_activity.userId
LEFT JOIN (
  SELECT
    creatorId as userId,
    COUNT(*) as challengesSent,
    0 as challengesReceived
  FROM Challenge
  WHERE createdAt >= datetime('now', '-90 days')
  GROUP BY creatorId
  UNION ALL
  SELECT
    targetUserId as userId,
    0 as challengesSent,
    COUNT(*) as challengesReceived
  FROM Challenge
  WHERE createdAt >= datetime('now', '-90 days')
  GROUP BY targetUserId
) challenge_stats ON u.id = challenge_stats.userId
LEFT JOIN (
  SELECT
    userId,
    COUNT(*) as matchesPlayed,
    SUM(CASE WHEN userId = winnerId THEN 1 ELSE 0 END) as matchesWon
  FROM (
    SELECT player1Id as userId, winnerId FROM Match WHERE status = 'completed'
    UNION ALL
    SELECT player2Id as userId, winnerId FROM Match WHERE status = 'completed'
  ) match_data
  GROUP BY userId
) match_stats ON u.id = match_stats.userId;
```

---

## 🔌 API Endpoint Specifications

### Analytics Routes Structure

```
/api/analytics/
├── overview/              # Overview dashboard data
│   ├── metrics           # Key performance indicators
│   ├── activity-feed     # Recent activity stream
│   └── health-score      # Overall league health
├── players/               # Player analytics
│   ├── segments          # Player segmentation data
│   ├── activity-heatmap  # Activity calendar heatmap
│   └── list              # Player list with analytics
├── competition/           # Competition analytics
│   ├── challenge-flow    # Challenge conversion funnel
│   ├── match-trends      # Match completion trends
│   └── venue-performance # Venue utilization stats
├── trends/                # Historical trends
│   ├── growth            # League growth metrics
│   ├── comparison        # Period-over-period analysis
│   └── export            # Data export endpoints
└── alerts/                # Alert management
    ├── list              # Active alerts
    ├── acknowledge       # Mark alerts as read
    └── configure         # Alert configuration
```

### Detailed API Specifications

#### GET /api/analytics/overview/metrics

**Purpose**: Retrieve key dashboard metrics  
**Authentication**: Admin required  
**Cache**: 5 minutes

**Query Parameters:**

- `period` (optional): `24h` | `7d` | `30d` | `90d` | `1y` (default: `30d`)
- `refresh` (optional): `true` to bypass cache

**Response Structure:**

```json
{
  "success": true,
  "data": {
    "leagueHealth": {
      "score": 87,
      "trend": "up",
      "factors": ["high_activity", "good_completion_rate"]
    },
    "activePlayers": {
      "current": 34,
      "previous": 31,
      "change": 9.7,
      "breakdown": {
        "highly_active": 12,
        "moderately_active": 18,
        "at_risk": 4
      }
    },
    "pendingChallenges": {
      "count": 8,
      "urgent": 2,
      "avgResponseTime": "2.3 days"
    },
    "matchCompletion": {
      "rate": 89.5,
      "trend": "up",
      "completedThisPeriod": 127
    }
  },
  "generatedAt": "2025-09-15T18:00:00Z",
  "cached": false
}
```

#### GET /api/analytics/players/segments

**Purpose**: Player segmentation analysis  
**Authentication**: Admin required  
**Cache**: 1 hour

**Response Structure:**

```json
{
  "success": true,
  "data": {
    "segments": {
      "highly_active": {
        "count": 12,
        "percentage": 35.3,
        "criteria": "Active within 7 days, 3+ activities",
        "trend": "up"
      },
      "moderately_active": {
        "count": 18,
        "percentage": 52.9,
        "criteria": "Active within 30 days, 1-2 activities",
        "trend": "stable"
      },
      "at_risk": {
        "count": 4,
        "percentage": 11.8,
        "criteria": "Inactive 30+ days",
        "trend": "down"
      }
    },
    "totalPlayers": 34,
    "newThisPeriod": 2,
    "churnedThisPeriod": 1
  }
}
```

#### GET /api/analytics/competition/challenge-flow

**Purpose**: Challenge conversion funnel metrics  
**Authentication**: Admin required  
**Cache**: 1 hour

**Response Structure:**

```json
{
  "success": true,
  "data": {
    "funnel": {
      "created": {
        "count": 23,
        "percentage": 100
      },
      "accepted": {
        "count": 18,
        "percentage": 78.3,
        "conversionRate": 78.3
      },
      "scheduled": {
        "count": 15,
        "percentage": 65.2,
        "conversionRate": 83.3
      },
      "completed": {
        "count": 12,
        "percentage": 52.2,
        "conversionRate": 80.0
      }
    },
    "avgTimeToAccept": "1.2 days",
    "avgTimeToComplete": "3.4 days",
    "topDeclineReasons": ["scheduling_conflict", "rank_difference"]
  }
}
```

---

## ⚙️ Analytics Service Architecture

### Core Analytics Service Class

```javascript
class AnalyticsService {
  constructor() {
    this.prisma = new PrismaClient();
    this.cache = new Map(); // In-memory cache for hot data
    this.alertThresholds = new Map(); // Alert configuration
    this.scheduledJobs = new Map(); // Background job tracking
  }

  // Metric calculation methods
  async calculateLeagueHealth(period = '30d') {
    /* ... */
  }
  async getPlayerSegments(refreshCache = false) {
    /* ... */
  }
  async getChallengeFlowMetrics(period = '7d') {
    /* ... */
  }
  async getMatchTrends(period = '30d') {
    /* ... */
  }

  // Data aggregation methods
  async aggregatePlayerActivity() {
    /* ... */
  }
  async aggregateCompetitionStats() {
    /* ... */
  }

  // Alert management methods
  async checkAlerts() {
    /* ... */
  }
  async triggerAlert(type, data) {
    /* ... */
  }
  async acknowledgeAlert(alertId, userId) {
    /* ... */
  }

  // Cache management
  async getCachedData(key) {
    /* ... */
  }
  async setCachedData(key, data, ttl) {
    /* ... */
  }
  async invalidateCache(pattern) {
    /* ... */
  }
}
```

### Metric Calculation Algorithms

#### League Health Score Calculation

```javascript
async calculateLeagueHealth(period = '30d') {
  const metrics = await this.getBaseMetrics(period);

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

  return {
    score: Math.round(healthScore),
    breakdown: {
      activity: Math.round(activityScore),
      engagement: Math.round(engagementScore),
      completion: Math.round(completionScore),
      growth: Math.round(growthScore)
    }
  };
}
```

#### Player Activity Segmentation

```javascript
async getPlayerSegments() {
  const query = `
    SELECT
      activitySegment,
      COUNT(*) as count,
      AVG(matchesPlayed) as avgMatches,
      AVG(julianday('now') - julianday(lastActive)) as avgDaysSinceActive
    FROM PlayerActivityView
    GROUP BY activitySegment
  `;

  const results = await this.prisma.$queryRaw(query);

  return {
    highly_active: results.find(r => r.activitySegment === 'highly_active'),
    moderately_active: results.find(r => r.activitySegment === 'moderately_active'),
    at_risk: results.find(r => r.activitySegment === 'at_risk')
  };
}
```

---

## 🔄 Real-time Updates Architecture

### WebSocket Integration

```javascript
// Extend existing Socket.IO implementation
io.on('connection', (socket) => {
  // Existing authentication...

  if (isAdmin(socket.userId)) {
    socket.join('analytics-updates');

    // Send initial analytics state
    socket.emit('analytics-initial', await getLatestMetrics());
  }
});

// Analytics update broadcaster
class AnalyticsRealtimeService {
  static async broadcastMetricUpdate(metricType, data) {
    io.to('analytics-updates').emit('metric-update', {
      type: metricType,
      data,
      timestamp: new Date().toISOString()
    });
  }

  static async broadcastAlert(alert) {
    io.to('analytics-updates').emit('alert', alert);
  }
}
```

### Event-Driven Updates

```javascript
// Hook into existing challenge/match events
async function onChallengeCreated(challenge) {
  // Existing challenge logic...

  // Update analytics
  await AnalyticsService.incrementMetric('challenges_created_today');
  await AnalyticsRealtimeService.broadcastMetricUpdate('challenge_flow', {
    created: await AnalyticsService.getChallengeCount('created', '24h')
  });
}

async function onMatchCompleted(match) {
  // Existing match logic...

  // Update analytics
  await AnalyticsService.updateMatchCompletionRate();
  await AnalyticsService.checkCompletionAlerts();

  // Real-time update
  await AnalyticsRealtimeService.broadcastMetricUpdate('match_completion', {
    rate: await AnalyticsService.getMatchCompletionRate()
  });
}
```

---

## 📊 Data Processing Pipeline

### Background Job Architecture

```javascript
class AnalyticsJobScheduler {
  constructor() {
    this.jobs = new Map();
    this.isRunning = false;
  }

  scheduleJob(name, interval, handler) {
    if (this.jobs.has(name)) {
      clearInterval(this.jobs.get(name));
    }

    const jobId = setInterval(async () => {
      try {
        await handler();
        logger.info(`Analytics job ${name} completed successfully`);
      } catch (error) {
        logger.error(`Analytics job ${name} failed:`, error);
      }
    }, interval);

    this.jobs.set(name, jobId);
  }

  start() {
    if (this.isRunning) return;

    // Schedule regular analytics jobs
    this.scheduleJob(
      'player-segmentation',
      60 * 60 * 1000, // 1 hour
      () => AnalyticsService.updatePlayerSegments()
    );

    this.scheduleJob(
      'metric-aggregation',
      15 * 60 * 1000, // 15 minutes
      () => AnalyticsService.aggregateRecentMetrics()
    );

    this.scheduleJob(
      'alert-check',
      5 * 60 * 1000, // 5 minutes
      () => AnalyticsService.checkAllAlerts()
    );

    this.scheduleJob(
      'cache-cleanup',
      24 * 60 * 60 * 1000, // 24 hours
      () => AnalyticsService.cleanupExpiredCache()
    );

    this.isRunning = true;
    logger.info('Analytics job scheduler started');
  }
}
```

### Metric Aggregation Strategy

```javascript
async aggregateRecentMetrics() {
  const now = new Date();
  const periods = [
    { name: '1h', start: new Date(now - 60 * 60 * 1000), end: now },
    { name: '24h', start: new Date(now - 24 * 60 * 60 * 1000), end: now },
    { name: '7d', start: new Date(now - 7 * 24 * 60 * 60 * 1000), end: now }
  ];

  for (const period of periods) {
    await Promise.all([
      this.calculatePlayerActivityMetrics(period),
      this.calculateChallengeFlowMetrics(period),
      this.calculateMatchCompletionMetrics(period)
    ]);
  }
}
```

---

## 🚨 Alert System Architecture

### Alert Processing Engine

```javascript
class AlertManager {
  constructor() {
    this.thresholds = new Map([
      ['player_inactivity', { days: 7, severity: 'warning' }],
      ['low_challenge_acceptance', { rate: 60, severity: 'warning' }],
      ['match_completion_drop', { rate: 75, severity: 'critical' }]
    ]);
  }

  async checkAllAlerts() {
    const checks = [
      this.checkPlayerInactivity(),
      this.checkChallengeAcceptanceRate(),
      this.checkMatchCompletionRate(),
      this.checkSystemHealth()
    ];

    const results = await Promise.allSettled(checks);
    const alerts = results
      .filter(r => r.status === 'fulfilled' && r.value)
      .map(r => r.value)
      .flat();

    for (const alert of alerts) {
      await this.triggerAlert(alert);
    }
  }

  async checkPlayerInactivity() {
    const inactivePlayers = await this.prisma.$queryRaw`
      SELECT id, displayName, lastActive 
      FROM PlayerActivityView 
      WHERE lastActive < datetime('now', '-7 days')
      AND activitySegment = 'at_risk'
    `;

    if (inactivePlayers.length > 0) {
      return {
        type: 'player_inactivity',
        severity: 'warning',
        title: `${inactivePlayers.length} Players At Risk`,
        message: `Players haven't been active in over 7 days`,
        data: { players: inactivePlayers }
      };
    }

    return null;
  }

  async triggerAlert(alert) {
    // Store alert in database
    const dbAlert = await this.prisma.analyticsAlert.create({
      data: alert
    });

    // Send real-time notification
    await AnalyticsRealtimeService.broadcastAlert(dbAlert);

    // Send push notification to admins
    await this.notificationService.sendSystemAlert(alert);

    return dbAlert;
  }
}
```

---

## 🔒 Security Architecture

### Access Control

- **Admin Authentication**: Extend existing JWT auth with admin role check
- **API Rate Limiting**: Separate rate limits for analytics endpoints (lower
  limits)
- **Data Sanitization**: All analytics queries use parameterized statements
- **Audit Logging**: Log all analytics access and administrative actions

### Data Privacy

- **PII Protection**: No personal information in cached analytics data
- **Aggregation Only**: Individual player data only accessible via secure
  endpoints
- **Data Retention**: Analytics data retained for 12 months, then archived
- **GDPR Compliance**: User data deletion includes analytics history

---

## 📈 Performance Optimization

### Caching Strategy

```javascript
class AnalyticsCache {
  constructor() {
    this.memoryCache = new Map(); // Hot data (< 1MB)
    this.diskCache = new SQLiteCache(); // Warm data (< 100MB)
  }

  async get(key, generator, ttl = 300) {
    // Check memory cache first
    if (this.memoryCache.has(key)) {
      const cached = this.memoryCache.get(key);
      if (cached.expires > Date.now()) {
        return cached.data;
      }
    }

    // Check disk cache
    const diskCached = await this.diskCache.get(key);
    if (diskCached && diskCached.expires > Date.now()) {
      // Promote to memory cache
      this.memoryCache.set(key, diskCached);
      return diskCached.data;
    }

    // Generate new data
    const data = await generator();
    await this.set(key, data, ttl);
    return data;
  }
}
```

### Database Optimization

- **Indexed Views**: Pre-calculated aggregations for common queries
- **Query Optimization**: Efficient joins and aggregations
- **Connection Pooling**: Dedicated pool for analytics queries
- **Read Replicas**: Separate read-only connections (future enhancement)

---

## 🧪 Testing Strategy

### Unit Tests

- Metric calculation accuracy
- Alert threshold logic
- Cache behavior
- Data aggregation functions

### Integration Tests

- API endpoint responses
- Real-time update delivery
- Database query performance
- Alert triggering scenarios

### Performance Tests

- Dashboard load times
- Concurrent user handling
- Large dataset processing
- Memory usage monitoring

---

## 🚀 Deployment Architecture

### Development Environment

- Local SQLite with sample analytics data
- In-memory caching for fast development
- Mock alert notifications
- Hot reload for analytics service

### Production Environment

- Production database with proper indexing
- Redis cache for distributed caching (future)
- Email/SMS alert integration
- Monitoring and logging integration

### Monitoring & Observability

- Analytics service health metrics
- Query performance monitoring
- Cache hit/miss ratios
- Alert response times
- User engagement with analytics dashboard

---

_This architecture document provides the technical foundation for implementing a
scalable, performant, and maintainable League Analytics Dashboard within the
Capital Ladder App ecosystem._
