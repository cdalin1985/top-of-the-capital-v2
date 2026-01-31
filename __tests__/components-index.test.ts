/**
 * Tests for components/index.ts barrel exports
 * Ensures all components are properly exported and accessible
 *
 * Note: These tests verify module structure and exports, not component rendering.
 * For rendering tests, consider adding @testing-library/react-native.
 */

// Mock React Native modules before importing components
jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  StyleSheet: {
    create: (styles: any) => styles,
  },
  Animated: {
    View: 'Animated.View',
    Value: jest.fn(() => ({
      interpolate: jest.fn(),
    })),
    timing: jest.fn(() => ({
      start: jest.fn(),
    })),
    loop: jest.fn(() => ({
      start: jest.fn(),
      stop: jest.fn(),
    })),
    sequence: jest.fn(),
  },
  ActivityIndicator: 'ActivityIndicator',
}));

jest.mock('lucide-react-native', () => ({
  WifiOff: 'WifiOff',
  RefreshCw: 'RefreshCw',
  AlertCircle: 'AlertCircle',
  CheckCircle: 'CheckCircle',
  Cloud: 'Cloud',
}));

jest.mock('../src/hooks/useSyncStatus', () => ({
  useSyncStatus: jest.fn(() => ({
    isOnline: true,
    statusType: 'synced',
    statusText: 'Synced',
    pendingCount: 0,
    failedCount: 0,
    lastSyncedAt: null,
    isSyncing: false,
  })),
  useSyncActions: jest.fn(() => ({
    sync: jest.fn(),
    retry: jest.fn(),
  })),
}));

jest.mock('../src/hooks/useNetworkStatus', () => ({
  useNetworkStatus: jest.fn(() => ({
    isConnected: true,
    connectionType: 'wifi',
  })),
}));

jest.mock('../src/store/useSyncStore', () => ({
  useSyncStore: jest.fn(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    setOnline: jest.fn(),
  })),
}));

describe('Components Module Exports', () => {
  // Import components after mocks are set up
  let ErrorBoundary: any;
  let SkeletonLoader: any;
  let SkeletonCard: any;
  let SkeletonRankingItem: any;
  let OfflineBanner: any;
  let SyncStatusBanner: any;
  let SyncIndicator: any;
  let SyncProvider: any;
  let useSyncReady: any;

  beforeAll(() => {
    // Dynamic import after mocks
    const components = require('../src/components');
    ErrorBoundary = components.ErrorBoundary;
    SkeletonLoader = components.SkeletonLoader;
    SkeletonCard = components.SkeletonCard;
    SkeletonRankingItem = components.SkeletonRankingItem;
    OfflineBanner = components.OfflineBanner;
    SyncStatusBanner = components.SyncStatusBanner;
    SyncIndicator = components.SyncIndicator;
    SyncProvider = components.SyncProvider;
    useSyncReady = components.useSyncReady;
  });

  describe('ErrorBoundary', () => {
    test('exports ErrorBoundary component', () => {
      expect(ErrorBoundary).toBeDefined();
      expect(typeof ErrorBoundary).toBe('function');
    });

    test('ErrorBoundary is a React class component with render method', () => {
      expect(ErrorBoundary.prototype).toBeDefined();
      expect(typeof ErrorBoundary.prototype.render).toBe('function');
    });

    test('ErrorBoundary has getDerivedStateFromError static method', () => {
      expect(typeof ErrorBoundary.getDerivedStateFromError).toBe('function');
    });
  });

  describe('SkeletonLoader components', () => {
    test('exports SkeletonLoader component', () => {
      expect(SkeletonLoader).toBeDefined();
      expect(typeof SkeletonLoader).toBe('function');
    });

    test('exports SkeletonCard component', () => {
      expect(SkeletonCard).toBeDefined();
      expect(typeof SkeletonCard).toBe('function');
    });

    test('exports SkeletonRankingItem component', () => {
      expect(SkeletonRankingItem).toBeDefined();
      expect(typeof SkeletonRankingItem).toBe('function');
    });
  });

  describe('Offline/Sync banner components', () => {
    test('exports OfflineBanner component', () => {
      expect(OfflineBanner).toBeDefined();
      expect(typeof OfflineBanner).toBe('function');
    });

    test('exports SyncStatusBanner component', () => {
      expect(SyncStatusBanner).toBeDefined();
      expect(typeof SyncStatusBanner).toBe('function');
    });

    test('exports SyncIndicator component', () => {
      expect(SyncIndicator).toBeDefined();
      expect(typeof SyncIndicator).toBe('function');
    });
  });

  describe('SyncProvider', () => {
    test('exports SyncProvider component', () => {
      expect(SyncProvider).toBeDefined();
      expect(typeof SyncProvider).toBe('function');
    });

    test('exports useSyncReady hook', () => {
      expect(useSyncReady).toBeDefined();
      expect(typeof useSyncReady).toBe('function');
    });
  });

  describe('Module structure', () => {
    test('all expected exports are present', () => {
      const components = require('../src/components');
      const expectedExports = [
        'ErrorBoundary',
        'SkeletonLoader',
        'SkeletonCard',
        'SkeletonRankingItem',
        'OfflineBanner',
        'SyncStatusBanner',
        'SyncIndicator',
        'SyncProvider',
        'useSyncReady',
      ];

      expectedExports.forEach((exportName) => {
        expect(components[exportName]).toBeDefined();
      });
    });

    test('exports count matches expected', () => {
      const components = require('../src/components');
      const exportKeys = Object.keys(components);
      // Should have exactly 9 exports
      expect(exportKeys.length).toBe(9);
    });
  });
});
