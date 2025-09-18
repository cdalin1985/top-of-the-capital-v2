/**
 * Capital Ladder Push Notification Service
 * Handles all push notification logic and delivery
 * Version 1.0 - Created 2025-09-15
 */

const webpush = require('web-push');
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

class NotificationService {
  constructor() {
    this.prisma = new PrismaClient();
    this.setupWebPush();
    this.metrics = {
      sent: 0,
      delivered: 0,
      failed: 0,
      clicked: 0
    };
  }

  setupWebPush() {
    // VAPID keys will be set via environment variables
    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      webpush.setVapidDetails(
        process.env.VAPID_SUBJECT || 'mailto:admin@capitolladder.com',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
      );
      logger.info('VAPID keys configured successfully');
    } else {
      logger.warn('VAPID keys not configured - push notifications will not work');
    }
  }

  /**
   * Send notification to a specific user
   */
  async sendNotification(userId, payload) {
    try {
      // Get user subscriptions
      const subscriptions = await this.getUserSubscriptions(userId);
      if (subscriptions.length === 0) {
        logger.info(`No subscriptions found for user ${userId}`);
        return { success: false, reason: 'no_subscriptions' };
      }

      // Check user preferences
      const preferences = await this.getUserPreferences(userId);
      if (!this.shouldSendNotification(payload.type, preferences)) {
        logger.info(`Notification blocked by user preferences: ${userId}`);
        return { success: false, reason: 'user_preferences' };
      }

      // Send to all user subscriptions
      const results = await Promise.allSettled(
        subscriptions.map(sub => this.sendToSubscription(sub, payload))
      );

      // Record in history
      await this.recordNotification(userId, payload, results);

      const summary = this.summarizeResults(results);
      this.updateMetrics(summary);

      logger.info(
        `Notification sent to ${userId}: ${summary.delivered}/${summary.total} delivered`
      );
      return summary;
    } catch (error) {
      logger.error('Notification send failed:', error);
      this.metrics.failed++;
      throw error;
    }
  }

  /**
   * Send notification to a single subscription
   */
  async sendToSubscription(subscription, payload) {
    const pushPayload = {
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/icons/badge-icon.png',
      badge: '/icons/badge-icon.png',
      tag: payload.tag,
      data: payload.data,
      actions: payload.actions || [],
      requireInteraction: payload.requireInteraction || false,
      silent: payload.silent || false
    };

    try {
      const result = await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth
          }
        },
        JSON.stringify(pushPayload)
      );

      logger.debug('Push notification sent successfully');
      return { success: true, result };
    } catch (error) {
      logger.error('Push notification failed:', error);

      // Handle expired subscriptions
      if (error.statusCode === 410 || error.statusCode === 404) {
        logger.info('Subscription expired, removing from database');
        await this.removeExpiredSubscription(subscription.id);
      }

      throw error;
    }
  }

  /**
   * Get all subscriptions for a user
   */
  async getUserSubscriptions(userId) {
    return await this.prisma.pushSubscription.findMany({
      where: { userId }
    });
  }

  /**
   * Get user notification preferences
   */
  async getUserPreferences(userId) {
    let preferences = await this.prisma.notificationPreferences.findUnique({
      where: { userId }
    });

    if (!preferences) {
      // Create default preferences
      preferences = await this.prisma.notificationPreferences.create({
        data: {
          userId,
          challengesEnabled: true,
          matchesEnabled: true,
          systemEnabled: true
        }
      });
    }

    return preferences;
  }

  /**
   * Check if notification should be sent based on preferences
   */
  shouldSendNotification(type, preferences) {
    if (!preferences) {
      return true;
    }

    // Check quiet hours
    if (this.isQuietHours(preferences)) {
      logger.info('Notification blocked by quiet hours');
      return false;
    }

    // Check type-specific preferences
    switch (type) {
      case 'challenge':
        return preferences.challengesEnabled;
      case 'match':
        return preferences.matchesEnabled;
      case 'system':
        return preferences.systemEnabled;
      default:
        return true;
    }
  }

  /**
   * Check if current time is in quiet hours
   */
  isQuietHours(preferences) {
    if (!preferences.quietHoursStart || !preferences.quietHoursEnd) {
      return false;
    }

    const now = new Date();
    const currentTime = now.getHours() * 100 + now.getMinutes();

    const startTime = this.timeToNumber(preferences.quietHoursStart);
    const endTime = this.timeToNumber(preferences.quietHoursEnd);

    if (startTime < endTime) {
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Quiet hours span midnight
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  /**
   * Convert time string (HH:MM) to number (HHMM)
   */
  timeToNumber(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 100 + minutes;
  }

  /**
   * Record notification in history
   */
  async recordNotification(userId, payload, results) {
    try {
      await this.prisma.notificationHistory.create({
        data: {
          userId,
          type: payload.type || 'general',
          title: payload.title,
          body: payload.body,
          data: payload.data ? JSON.stringify(payload.data) : null
        }
      });
    } catch (error) {
      logger.error('Failed to record notification history:', error);
    }
  }

  /**
   * Remove expired subscription from database
   */
  async removeExpiredSubscription(subscriptionId) {
    try {
      await this.prisma.pushSubscription.delete({
        where: { id: subscriptionId }
      });
      logger.info('Expired subscription removed');
    } catch (error) {
      logger.error('Failed to remove expired subscription:', error);
    }
  }

  /**
   * Summarize push notification results
   */
  summarizeResults(results) {
    const total = results.length;
    const delivered = results.filter(r => r.status === 'fulfilled').length;
    const failed = total - delivered;

    return {
      success: delivered > 0,
      total,
      delivered,
      failed,
      rate: total > 0 ? ((delivered / total) * 100).toFixed(1) : 0
    };
  }

  /**
   * Update internal metrics
   */
  updateMetrics(summary) {
    this.metrics.sent += summary.total;
    this.metrics.delivered += summary.delivered;
    this.metrics.failed += summary.failed;
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      successRate:
        this.metrics.sent > 0 ? ((this.metrics.delivered / this.metrics.sent) * 100).toFixed(1) : 0
    };
  }

  /**
   * Create subscription for user
   */
  async createSubscription(userId, subscription, userAgent = null) {
    try {
      // Check if subscription already exists
      const existing = await this.prisma.pushSubscription.findUnique({
        where: { endpoint: subscription.endpoint }
      });

      if (existing) {
        logger.info('Subscription already exists');
        return { success: true, existing: true };
      }

      // Create new subscription
      await this.prisma.pushSubscription.create({
        data: {
          userId,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          userAgent
        }
      });

      logger.info(`New subscription created for user ${userId}`);
      return { success: true, new: true };
    } catch (error) {
      logger.error('Failed to create subscription:', error);
      throw error;
    }
  }

  /**
   * Remove subscription for user
   */
  async removeSubscription(userId, endpoint) {
    try {
      await this.prisma.pushSubscription.deleteMany({
        where: { userId, endpoint }
      });
      logger.info(`Subscription removed for user ${userId}`);
      return true;
    } catch (error) {
      logger.error('Failed to remove subscription:', error);
      return false;
    }
  }

  /**
   * Update user notification preferences
   */
  async updatePreferences(userId, preferences) {
    try {
      const updated = await this.prisma.notificationPreferences.upsert({
        where: { userId },
        update: {
          challengesEnabled: preferences.challenges,
          matchesEnabled: preferences.matches,
          systemEnabled: preferences.system,
          quietHoursStart: preferences.quietHours?.start,
          quietHoursEnd: preferences.quietHours?.end
        },
        create: {
          userId,
          challengesEnabled: preferences.challenges,
          matchesEnabled: preferences.matches,
          systemEnabled: preferences.system,
          quietHoursStart: preferences.quietHours?.start,
          quietHoursEnd: preferences.quietHours?.end
        }
      });

      logger.info(`Preferences updated for user ${userId}`);
      return updated;
    } catch (error) {
      logger.error('Failed to update preferences:', error);
      throw error;
    }
  }

  /**
   * Get notification history for user
   */
  async getNotificationHistory(userId, page = 1, limit = 20) {
    try {
      const offset = (page - 1) * limit;

      const notifications = await this.prisma.notificationHistory.findMany({
        where: { userId },
        orderBy: { sentAt: 'desc' },
        skip: offset,
        take: limit
      });

      const total = await this.prisma.notificationHistory.count({
        where: { userId }
      });

      return {
        notifications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Failed to get notification history:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(userId, notificationId) {
    try {
      await this.prisma.notificationHistory.updateMany({
        where: { id: notificationId, userId },
        data: { readAt: new Date() }
      });
      return true;
    } catch (error) {
      logger.error('Failed to mark notification as read:', error);
      return false;
    }
  }

  /**
   * Get VAPID public key
   */
  getVapidPublicKey() {
    return process.env.VAPID_PUBLIC_KEY;
  }
}

module.exports = NotificationService;
