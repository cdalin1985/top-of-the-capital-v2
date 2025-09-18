# Story 1.1: Service Worker Foundation

**Epic**: Foundation Infrastructure  
**Priority**: P0 (Critical)  
**Estimated Effort**: 4-6 hours  
**Sprint**: 1

## User Story

**As a** user visiting the Capital Ladder App  
**I want** the system to automatically register a service worker  
**So that** I can receive push notifications even when the tab is closed

## Acceptance Criteria

- [ ] Service worker registers automatically on first app load
- [ ] Service worker updates automatically when app updates
- [ ] Graceful fallback for browsers without service worker support
- [ ] Error logging for service worker registration failures
- [ ] Service worker caches notification assets (icons, etc.)
- [ ] Push event listener is properly configured
- [ ] Notification click event handling is implemented
- [ ] Background sync capability is set up

## Technical Requirements

### 1. Create Service Worker File (`public/sw.js`)

```javascript
// Service Worker for Capital Ladder Push Notifications
const CACHE_NAME = 'capital-ladder-notifications-v1';
const API_BASE = self.location.origin;

// Cache notification assets during install
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll([
        '/icons/challenge-icon.png',
        '/icons/match-icon.png',
        '/icons/badge-icon.png',
        '/icons/accept-icon.png',
        '/icons/decline-icon.png'
      ]);
    })
  );
});

// Handle push notifications
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};

  event.waitUntil(showNotification(data));
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action) {
    event.waitUntil(
      handleNotificationAction(event.action, event.notification.data)
    );
  } else {
    event.waitUntil(openApp(event.notification.data.actionUrl));
  }
});

async function showNotification(data) {
  const options = {
    body: data.body,
    icon: data.icon || '/icons/badge-icon.png',
    badge: '/icons/badge-icon.png',
    tag: data.tag,
    data: data.data,
    actions: data.actions || [],
    requireInteraction: data.requireInteraction || false,
    silent: data.silent || false
  };

  return self.registration.showNotification(data.title, options);
}

async function handleNotificationAction(action, data) {
  // Handle accept/decline challenge actions
  if (
    data.type === 'challenge' &&
    (action === 'accept' || action === 'decline')
  ) {
    try {
      const response = await fetch(
        `${API_BASE}/api/challenges/${data.challengeId}/${action}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ actionSource: 'notification' })
        }
      );

      if (response.ok) {
        // Show confirmation notification
        await showConfirmationNotification(action, data);
      }
    } catch (error) {
      console.error('Notification action failed:', error);
      // Fallback: open the app
      await openApp(data.actionUrl);
    }
  }
}

async function showConfirmationNotification(action, data) {
  const title =
    action === 'accept' ? 'Challenge Accepted!' : 'Challenge Declined';
  const body = `You ${action}ed the challenge. Opening app...`;

  await self.registration.showNotification(title, {
    body,
    icon: '/icons/badge-icon.png',
    tag: `confirmation-${data.challengeId}`,
    requireInteraction: false
  });

  // Auto-open app after confirmation
  setTimeout(() => openApp(data.actionUrl), 2000);
}

async function openApp(url = '/') {
  const clients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  });

  // If app is already open, focus it
  for (const client of clients) {
    if (client.url.includes(self.location.origin)) {
      client.focus();
      if (url !== '/') client.navigate(url);
      return;
    }
  }

  // Otherwise, open new window
  return self.clients.openWindow(url);
}
```

### 2. Update Main App to Register Service Worker (`public/app.js`)

```javascript
// Add to existing app.js initialization
class ServiceWorkerManager {
  constructor() {
    this.registration = null;
    this.isSupported = this.checkSupport();
  }

  checkSupport() {
    return (
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  }

  async initialize() {
    if (!this.isSupported) {
      console.warn('Push notifications not supported in this browser');
      return false;
    }

    try {
      this.registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', this.registration);

      // Set up update listener
      this.setupUpdateListener();

      return true;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return false;
    }
  }

  setupUpdateListener() {
    this.registration.addEventListener('updatefound', () => {
      const newWorker = this.registration.installing;

      newWorker.addEventListener('statechange', () => {
        if (
          newWorker.state === 'installed' &&
          navigator.serviceWorker.controller
        ) {
          // New service worker is available
          this.showUpdateNotification();
        }
      });
    });
  }

  showUpdateNotification() {
    // Show user-friendly update notification
    console.log('New version available! Refresh to update.');
    // Could show a toast notification here
  }

  getRegistration() {
    return this.registration;
  }
}

// Initialize service worker when app loads
document.addEventListener('DOMContentLoaded', async () => {
  const swManager = new ServiceWorkerManager();
  const initialized = await swManager.initialize();

  if (initialized) {
    // Store reference for use by notification manager
    window.serviceWorkerManager = swManager;
  }

  // Continue with existing app initialization...
});
```

### 3. Add Service Worker Route in Server (`server.js`)

```javascript
// Add to existing server.js
// Serve service worker with proper headers
app.get('/sw.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Cache-Control', 'max-age=0'); // Don't cache SW for updates
  res.setHeader('Service-Worker-Allowed', '/');
  res.sendFile(path.join(__dirname, 'public', 'sw.js'));
});
```

## Testing Requirements

### Unit Tests

- Service worker registration success/failure scenarios
- Push event handling with various payload types
- Notification click event routing
- Cache initialization and asset loading

### Browser Testing

- Chrome 50+ (primary)
- Firefox 44+ (secondary)
- Safari 16+ (if supported)
- Edge 17+ (if supported)

### Integration Testing

- Service worker updates when app version changes
- Proper fallback when service worker fails
- Error handling for network failures

## Definition of Done

- [ ] Service worker file created and properly configured
- [ ] Registration logic added to main application
- [ ] Server route for service worker delivery implemented
- [ ] Push event listener handles notifications correctly
- [ ] Notification click events route to correct pages
- [ ] Error handling for unsupported browsers implemented
- [ ] Unit tests written and passing
- [ ] Cross-browser testing completed
- [ ] Code reviewed and approved
- [ ] Documentation updated

## Dependencies

- Existing Capital Ladder app structure
- Notification icons (challenge, match, badge, accept, decline)
- Express server routing capability

## Notes

- Service worker must be served from root domain for full access
- Cache versioning strategy prevents stale service worker issues
- Progressive enhancement ensures app works without notifications
- Error handling provides graceful degradation

## Next Stories

- Story 1.2: Push Subscription Management
- Story 1.3: Database Schema Implementation
- Story 1.4: Basic API Endpoints
