/**
 * Capital Ladder Push Notification Manager
 * Client-side notification handling and service worker management
 * Version 1.0 - Created 2025-09-15
 */

class NotificationManager {
  constructor() {
    this.registration = null;
    this.subscription = null;
    this.isSupported = this.checkSupport();
    this.vapidPublicKey = null;

    // Initialize immediately
    this.initialize();
  }

  /**
   * Check if push notifications are supported in this browser
   */
  checkSupport() {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  }

  /**
   * Initialize the notification system
   */
  async initialize() {
    if (!this.isSupported) {
      console.warn('Push notifications not supported in this browser');
      return { success: false, reason: 'not_supported' };
    }

    try {
      // Register service worker
      this.registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered successfully:', this.registration);

      // Set up update listener
      this.setupUpdateListener();

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;

      // Get VAPID public key from server
      await this.getVAPIDPublicKey();

      return { success: true };
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return { success: false, reason: 'registration_failed', error };
    }
  }

  /**
   * Set up service worker update listener
   */
  setupUpdateListener() {
    this.registration.addEventListener('updatefound', () => {
      const newWorker = this.registration.installing;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed') {
          if (navigator.serviceWorker.controller) {
            // New service worker available
            console.log('New version available! Please refresh.');
            this.showUpdateNotification();
          } else {
            // Service worker installed for the first time
            console.log('Service Worker installed for the first time');
          }
        }
      });
    });
  }

  /**
   * Show user-friendly update notification
   */
  showUpdateNotification() {
    // This could integrate with your existing toast system
    if (window.showToast) {
      window.showToast('New version available! Refresh to update.', 'info', 5000);
    } else {
      console.log('New version available! Refresh to update.');
    }
  }

  /**
   * Get VAPID public key from server
   */
  async getVAPIDPublicKey() {
    try {
      const response = await fetch('/api/notifications/vapid-public-key');
      if (response.ok) {
        const data = await response.json();
        this.vapidPublicKey = data.publicKey;
        return this.vapidPublicKey;
      } else {
        throw new Error('Failed to get VAPID public key');
      }
    } catch (error) {
      console.error('Failed to get VAPID public key:', error);
      // Use a default key for development (this should be from environment)
      this.vapidPublicKey =
        'BEl62iUYgUivxIkv69yViUuiSRaiVdMYKXUdBNMFWsEKKTzSKxCL9vOUXQVXO6qVzpQA6P1p3h3W1T4S5G6CdF8';
      return this.vapidPublicKey;
    }
  }

  /**
   * Request permission for notifications
   */
  async requestPermission() {
    if (!this.isSupported) {
      return { success: false, reason: 'not_supported' };
    }

    const permission = Notification.permission;

    if (permission === 'granted') {
      return { success: true, permission: 'granted' };
    }

    if (permission === 'denied') {
      return { success: false, reason: 'permission_denied', permission: 'denied' };
    }

    try {
      const result = await Notification.requestPermission();
      return {
        success: result === 'granted',
        permission: result,
        reason: result !== 'granted' ? 'permission_denied' : null
      };
    } catch (error) {
      console.error('Permission request failed:', error);
      return { success: false, reason: 'permission_error', error };
    }
  }

  /**
   * Subscribe to push notifications
   */
  async subscribe() {
    if (!this.registration) {
      const initResult = await this.initialize();
      if (!initResult.success) {
        return initResult;
      }
    }

    // Request permission first
    const permissionResult = await this.requestPermission();
    if (!permissionResult.success) {
      return permissionResult;
    }

    try {
      // Check if already subscribed
      const existingSubscription = await this.registration.pushManager.getSubscription();
      if (existingSubscription) {
        this.subscription = existingSubscription;
        console.log('Already subscribed to push notifications');
        return { success: true, subscription: existingSubscription, existing: true };
      }

      // Create new subscription
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
      });

      // Send subscription to server
      const serverResult = await this.sendSubscriptionToServer(subscription);
      if (serverResult.success) {
        this.subscription = subscription;
        console.log('Successfully subscribed to push notifications');
        return { success: true, subscription, new: true };
      } else {
        throw new Error('Failed to save subscription on server');
      }
    } catch (error) {
      console.error('Push subscription failed:', error);
      return { success: false, reason: 'subscription_failed', error };
    }
  }

  /**
   * Send subscription to server
   */
  async sendSubscriptionToServer(subscription) {
    try {
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('cl_token')}`
        },
        body: JSON.stringify({ subscription })
      });

      if (response.ok) {
        const data = await response.json();
        return { success: true, data };
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Subscription failed');
      }
    } catch (error) {
      console.error('Failed to send subscription to server:', error);
      return { success: false, error };
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe() {
    if (!this.subscription) {
      return { success: true, message: 'Not subscribed' };
    }

    try {
      // Unsubscribe from push service
      await this.subscription.unsubscribe();

      // Remove from server
      await this.removeSubscriptionFromServer();

      this.subscription = null;
      console.log('Successfully unsubscribed from push notifications');
      return { success: true };
    } catch (error) {
      console.error('Unsubscribe failed:', error);
      return { success: false, error };
    }
  }

  /**
   * Remove subscription from server
   */
  async removeSubscriptionFromServer() {
    try {
      const response = await fetch('/api/notifications/unsubscribe', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('cl_token')}`
        },
        body: JSON.stringify({ endpoint: this.subscription.endpoint })
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to remove subscription from server:', error);
      return false;
    }
  }

  /**
   * Get current subscription status
   */
  async getSubscriptionStatus() {
    if (!this.isSupported) {
      return { supported: false, permission: 'not_supported', subscribed: false };
    }

    const permission = Notification.permission;

    if (!this.registration) {
      await this.initialize();
    }

    let subscribed = false;
    if (this.registration && permission === 'granted') {
      const subscription = await this.registration.pushManager.getSubscription();
      subscribed = !!subscription;
      this.subscription = subscription;
    }

    return {
      supported: true,
      permission,
      subscribed,
      subscription: this.subscription
    };
  }

  /**
   * Test notification (for development)
   */
  async testNotification() {
    if (!this.subscription) {
      const subscribeResult = await this.subscribe();
      if (!subscribeResult.success) {
        return subscribeResult;
      }
    }

    try {
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('cl_token')}`
        }
      });

      if (response.ok) {
        return { success: true, message: 'Test notification sent' };
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Test notification failed');
      }
    } catch (error) {
      console.error('Test notification failed:', error);
      return { success: false, error };
    }
  }

  /**
   * Convert VAPID key from URL-safe base64 to Uint8Array
   */
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /**
   * Show permission request modal with explanation
   */
  showPermissionModal() {
    // This would integrate with your existing modal system
    const modal = document.createElement('div');
    modal.className = 'notification-permission-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>🔔 Enable Push Notifications</h3>
        </div>
        <div class="modal-body">
          <p>Get instant alerts for:</p>
          <ul>
            <li>🎯 New challenge invitations</li>
            <li>🎱 Match starting reminders</li>
            <li>🏆 Tournament announcements</li>
            <li>📊 Leaderboard updates</li>
          </ul>
          <p>You can disable these anytime in settings.</p>
        </div>
        <div class="modal-actions">
          <button id="enable-notifications" class="btn btn-primary">Enable Notifications</button>
          <button id="cancel-notifications" class="btn btn-secondary">Not Now</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Add event listeners
    document.getElementById('enable-notifications').onclick = async () => {
      const result = await this.subscribe();
      modal.remove();

      if (result.success) {
        if (window.showToast) {
          window.showToast('Notifications enabled successfully!', 'success');
        }
      } else {
        if (window.showToast) {
          window.showToast(
            'Failed to enable notifications. Please check browser settings.',
            'error'
          );
        }
      }
    };

    document.getElementById('cancel-notifications').onclick = () => {
      modal.remove();
    };
  }

  /**
   * Get service worker registration
   */
  getRegistration() {
    return this.registration;
  }
}

// Initialize notification manager when DOM is loaded
let notificationManager;

document.addEventListener('DOMContentLoaded', () => {
  notificationManager = new NotificationManager();

  // Make it globally accessible
  window.notificationManager = notificationManager;

  console.log('Notification Manager initialized');
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NotificationManager;
}
