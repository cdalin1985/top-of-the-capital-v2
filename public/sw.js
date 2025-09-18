// Capital Ladder Push Notification Service Worker
// Version 1.0 - Created 2025-09-15

const CACHE_NAME = 'capital-ladder-notifications-v1';
const API_BASE = self.location.origin;

// Cache notification assets during install
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(cache => {
        return cache
          .addAll([
            '/icons/challenge-icon.png',
            '/icons/match-icon.png',
            '/icons/badge-icon.png',
            '/icons/accept-icon.png',
            '/icons/decline-icon.png'
          ])
          .then(() => {
            console.log('Service Worker: Notification assets cached');
          });
      })
      .catch(error => {
        console.error('Service Worker: Cache failed', error);
      })
  );
});

// Activate service worker and clean old caches
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');

  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Handle push notifications
self.addEventListener('push', event => {
  console.log('Service Worker: Push event received');

  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (error) {
    console.error('Service Worker: Invalid push data', error);
    data = { title: 'Capital Ladder', body: 'New notification' };
  }

  event.waitUntil(showNotification(data));
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  console.log('Service Worker: Notification clicked', event);

  event.notification.close();

  if (event.action) {
    event.waitUntil(handleNotificationAction(event.action, event.notification.data));
  } else {
    const url = event.notification.data?.actionUrl || '/';
    event.waitUntil(openApp(url));
  }
});

// Show notification with proper options
async function showNotification(data) {
  const options = {
    body: data.body || 'New activity in Capital Ladder',
    icon: data.icon || '/icons/badge-icon.png',
    badge: '/icons/badge-icon.png',
    tag: data.tag || 'capital-ladder-notification',
    data: data.data || {},
    actions: data.actions || [],
    requireInteraction: data.requireInteraction || false,
    silent: data.silent || false,
    timestamp: Date.now()
  };

  const title = data.title || 'Capital Ladder';

  try {
    await self.registration.showNotification(title, options);
    console.log('Service Worker: Notification shown', title);
  } catch (error) {
    console.error('Service Worker: Failed to show notification', error);
  }
}

// Handle notification actions (accept/decline challenges)
async function handleNotificationAction(action, data) {
  console.log('Service Worker: Handling action', action, data);

  if (data.type === 'challenge' && (action === 'accept' || action === 'decline')) {
    try {
      // Make API call to handle challenge response
      const response = await fetch(`${API_BASE}/api/challenges/${data.challengeId}/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          actionSource: 'notification',
          timestamp: Date.now()
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Service Worker: Action successful', result);

        // Show confirmation notification
        await showConfirmationNotification(action, data);

        // Open app after short delay
        setTimeout(() => {
          openApp(data.actionUrl || '/');
        }, 2000);
      } else {
        console.error('Service Worker: Action failed', response.status);
        // Fallback: just open the app
        await openApp(data.actionUrl || '/');
      }
    } catch (error) {
      console.error('Service Worker: Action error', error);
      // Fallback: open the app
      await openApp(data.actionUrl || '/');
    }
  } else {
    // For other action types, just open the app
    await openApp(data.actionUrl || '/');
  }
}

// Show confirmation after successful action
async function showConfirmationNotification(action, data) {
  const actionText = action === 'accept' ? 'accepted' : 'declined';
  const title = `Challenge ${actionText.charAt(0).toUpperCase() + actionText.slice(1)}!`;
  const body = `You ${actionText} the challenge. Opening app...`;

  const options = {
    body,
    icon: '/icons/badge-icon.png',
    tag: `confirmation-${data.challengeId}`,
    requireInteraction: false,
    silent: false,
    actions: [] // No actions needed for confirmation
  };

  try {
    await self.registration.showNotification(title, options);
  } catch (error) {
    console.error('Service Worker: Failed to show confirmation', error);
  }
}

// Open or focus the Capital Ladder app
async function openApp(url = '/') {
  console.log('Service Worker: Opening app', url);

  try {
    const clients = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    });

    // Check if app is already open
    for (const client of clients) {
      if (client.url.includes(self.location.origin)) {
        console.log('Service Worker: Focusing existing window');

        // Focus existing window
        await client.focus();

        // Navigate if URL is different
        if (url !== '/' && !client.url.includes(url)) {
          try {
            await client.navigate(url);
          } catch (navError) {
            console.warn('Service Worker: Navigation failed', navError);
          }
        }

        return client;
      }
    }

    // No existing window found, open new one
    console.log('Service Worker: Opening new window');
    const fullUrl = url.startsWith('http') ? url : `${self.location.origin}${url}`;
    return await self.clients.openWindow(fullUrl);
  } catch (error) {
    console.error('Service Worker: Failed to open app', error);
    // Last resort: try to open new window with base URL
    return await self.clients.openWindow(self.location.origin);
  }
}

// Handle background sync for offline actions
self.addEventListener('sync', event => {
  console.log('Service Worker: Background sync', event.tag);

  if (event.tag === 'challenge-action-sync') {
    event.waitUntil(syncChallengeActions());
  }
});

// Sync pending challenge actions when back online
async function syncChallengeActions() {
  console.log('Service Worker: Syncing challenge actions');

  try {
    // Get pending actions from IndexedDB or localStorage
    // This would be implemented when background sync story is developed
    console.log('Service Worker: Background sync completed');
  } catch (error) {
    console.error('Service Worker: Background sync failed', error);
  }
}

// Handle service worker messages from main thread
self.addEventListener('message', event => {
  console.log('Service Worker: Message received', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Error handling for uncaught errors
self.addEventListener('error', error => {
  console.error('Service Worker: Uncaught error', error);
});

self.addEventListener('unhandledrejection', event => {
  console.error('Service Worker: Unhandled rejection', event.reason);
});

console.log('Service Worker: Script loaded and event listeners registered');
