/**
 * Push Notification API Routes
 * Handles all push notification related endpoints
 * Version 1.0 - Created 2025-09-15
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const NotificationService = require('../lib/notification-service');
const securityConfig = require('../config/security');

// Auth middleware matching server pattern
function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  let token = header.startsWith('Bearer ') ? header.slice(7) : header;
  if (!token && req.cookies?.token) {
    token = req.cookies.token;
  }
  if (!token && req.headers?.cookie) {
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
    return res.status(401).json({ success: false, error: 'Missing token' });
  }
  try {
    const { secret } = securityConfig.getJWTConfig();
    const p = jwt.verify(token, secret);
    req.userId = p.userId;
    req.user = { id: p.userId }; // For compatibility
    next();
  } catch {
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
}

const notificationService = new NotificationService();

/**
 * Get VAPID Public Key
 * Required for push notification subscriptions
 */
router.get('/vapid-public-key', (req, res) => {
  try {
    const publicKey = notificationService.getVapidPublicKey();
    if (!publicKey) {
      return res.status(503).json({
        success: false,
        error: 'Push notifications not configured'
      });
    }

    res.json({
      success: true,
      publicKey
    });
  } catch (error) {
    console.error('Error getting VAPID key:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * Subscribe to push notifications
 */
router.post('/subscribe', authMiddleware, async (req, res) => {
  try {
    const { subscription } = req.body;
    const userId = req.userId;
    const userAgent = req.get('User-Agent');

    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({
        success: false,
        error: 'Invalid subscription data'
      });
    }

    const result = await notificationService.createSubscription(userId, subscription, userAgent);

    res.json({
      success: true,
      message: result.existing ? 'Subscription already exists' : 'Subscription created',
      ...result
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create subscription'
    });
  }
});

/**
 * Unsubscribe from push notifications
 */
router.post('/unsubscribe', authMiddleware, async (req, res) => {
  try {
    const { endpoint } = req.body;
    const userId = req.userId;

    if (!endpoint) {
      return res.status(400).json({
        success: false,
        error: 'Endpoint required'
      });
    }

    const success = await notificationService.removeSubscription(userId, endpoint);

    if (success) {
      res.json({
        success: true,
        message: 'Subscription removed'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to remove subscription'
      });
    }
  } catch (error) {
    console.error('Error removing subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove subscription'
    });
  }
});

/**
 * Get notification preferences
 */
router.get('/preferences', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const preferences = await notificationService.getUserPreferences(userId);

    res.json({
      success: true,
      preferences: {
        challenges: preferences.challengesEnabled,
        matches: preferences.matchesEnabled,
        system: preferences.systemEnabled,
        quietHours: {
          start: preferences.quietHoursStart,
          end: preferences.quietHoursEnd
        }
      }
    });
  } catch (error) {
    console.error('Error getting preferences:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get preferences'
    });
  }
});

/**
 * Update notification preferences
 */
router.put('/preferences', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const { challenges, matches, system, quietHours } = req.body;

    // Validate quiet hours format if provided
  if (quietHours) {
      const validHHMM = (s) => {
        if (!/^\d{2}:\d{2}$/.test(s)) return false;
        const [hh, mm] = s.split(':').map(Number);
        return hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59;
      };
      if (quietHours.start && !validHHMM(quietHours.start)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid quiet hours start format (use HH:MM)'
        });
      }
      if (quietHours.end && !validHHMM(quietHours.end)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid quiet hours end format (use HH:MM)'
        });
      }
    }

    const preferences = await notificationService.updatePreferences(userId, {
      challenges: challenges !== undefined ? challenges : true,
      matches: matches !== undefined ? matches : true,
      system: system !== undefined ? system : true,
      quietHours
    });

    res.json({
      success: true,
      message: 'Preferences updated',
      preferences: {
        challenges: preferences.challengesEnabled,
        matches: preferences.matchesEnabled,
        system: preferences.systemEnabled,
        quietHours: {
          start: preferences.quietHoursStart,
          end: preferences.quietHoursEnd
        }
      }
    });
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update preferences'
    });
  }
});

/**
 * Get notification history
 */
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);

    const history = await notificationService.getNotificationHistory(userId, page, limit);

    res.json({
      success: true,
      ...history
    });
  } catch (error) {
    console.error('Error getting notification history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get notification history'
    });
  }
});

/**
 * Mark notification as read
 */
router.post('/mark-read/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const notificationId = parseInt(req.params.id);

    if (!notificationId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid notification ID'
      });
    }

    const success = await notificationService.markAsRead(userId, notificationId);

    if (success) {
      res.json({
        success: true,
        message: 'Notification marked as read'
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Notification not found or already marked as read'
      });
    }
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark notification as read'
    });
  }
});

/**
 * Send test notification (admin only)
 */
router.post('/test', authMiddleware, async (req, res) => {
  try {
    // Simple admin check - in production this would be more sophisticated
    // Simple admin check - would need proper user lookup in production
    if (req.userId !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { userId, title, body, type = 'system' } = req.body;
    const targetUserId = userId || req.userId;

    if (!title || !body) {
      return res.status(400).json({
        success: false,
        error: 'Title and body are required'
      });
    }

    const result = await notificationService.sendNotification(targetUserId, {
      title,
      body,
      type,
      data: { test: true, timestamp: Date.now() },
      icon: '/icons/badge-icon.png'
    });

    res.json({
      success: true,
      message: 'Test notification sent',
      result
    });
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send test notification'
    });
  }
});

/**
 * Get notification service metrics (admin only)
 */
router.get('/metrics', authMiddleware, (req, res) => {
  try {
    // Simple admin check - in production this would be more sophisticated
    // Simple admin check - would need proper user lookup in production
    if (req.userId !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const metrics = notificationService.getMetrics();

    res.json({
      success: true,
      metrics
    });
  } catch (error) {
    console.error('Error getting metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get metrics'
    });
  }
});

module.exports = router;
