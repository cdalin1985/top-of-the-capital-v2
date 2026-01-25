/**
 * Tests for OfflineBanner.tsx components
 * Tests for OfflineBanner, SyncStatusBanner, and SyncIndicator components
 */

import React from 'react';

// Mock React Native modules before importing components
jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  StyleSheet: {
    create: (styles: any) => styles,
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

// Mock useSyncStatus with ability to change returned values
const mockUseSyncStatus = jest.fn();
const mockUseSyncActions = jest.fn();

jest.mock('../src/hooks/useSyncStatus', () => ({
  useSyncStatus: () => mockUseSyncStatus(),
  useSyncActions: () => mockUseSyncActions(),
}));

describe('OfflineBanner Components', () => {
  let OfflineBanner: any;
  let SyncStatusBanner: any;
  let SyncIndicator: any;

  // Default mock values
  const defaultSyncStatus = {
    isOnline: true,
    statusType: 'synced' as const,
    statusText: 'All changes synced',
    pendingCount: 0,
    failedCount: 0,
    lastSyncedAt: null,
    isSyncing: false,
  };

  const defaultSyncActions = {
    sync: jest.fn(),
    retry: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSyncStatus.mockReturnValue(defaultSyncStatus);
    mockUseSyncActions.mockReturnValue(defaultSyncActions);
  });

  beforeAll(() => {
    const components = require('../src/components/OfflineBanner');
    OfflineBanner = components.OfflineBanner;
    SyncStatusBanner = components.SyncStatusBanner;
    SyncIndicator = components.SyncIndicator;
  });

  describe('OfflineBanner', () => {
    test('is exported and is a function', () => {
      expect(OfflineBanner).toBeDefined();
      expect(typeof OfflineBanner).toBe('function');
    });

    test('returns null when online and synced', () => {
      mockUseSyncStatus.mockReturnValue({
        ...defaultSyncStatus,
        isOnline: true,
        statusType: 'synced',
      });

      const result = OfflineBanner();
      expect(result).toBeNull();
    });

    test('renders banner when offline', () => {
      mockUseSyncStatus.mockReturnValue({
        ...defaultSyncStatus,
        isOnline: false,
        statusType: 'offline',
        statusText: 'Offline',
      });

      const result = OfflineBanner();
      expect(result).not.toBeNull();
      expect(result.type).toBe('View');
    });

    test('renders banner when syncing', () => {
      mockUseSyncStatus.mockReturnValue({
        ...defaultSyncStatus,
        statusType: 'syncing',
        statusText: 'Syncing...',
        isSyncing: true,
      });

      const result = OfflineBanner();
      expect(result).not.toBeNull();
      expect(result.type).toBe('View');
    });

    test('renders banner with error status', () => {
      mockUseSyncStatus.mockReturnValue({
        ...defaultSyncStatus,
        statusType: 'error',
        statusText: '1 operation failed',
        failedCount: 1,
      });

      const result = OfflineBanner();
      expect(result).not.toBeNull();
      expect(result.type).toBe('View');
    });

    test('renders banner when pending changes exist', () => {
      mockUseSyncStatus.mockReturnValue({
        ...defaultSyncStatus,
        statusType: 'pending',
        statusText: '3 changes pending',
        pendingCount: 3,
      });

      const result = OfflineBanner();
      expect(result).not.toBeNull();
    });

    test('displays status text correctly', () => {
      const statusText = 'Custom status message';
      mockUseSyncStatus.mockReturnValue({
        ...defaultSyncStatus,
        isOnline: false,
        statusType: 'offline',
        statusText,
      });

      const result = OfflineBanner();
      // Find Text child with status text
      const textChild = result.props.children.find(
        (child: any) => child && child.type === 'Text'
      );
      expect(textChild).toBeDefined();
      expect(textChild.props.children).toBe(statusText);
    });

    test('shows retry button when status is error', () => {
      mockUseSyncStatus.mockReturnValue({
        ...defaultSyncStatus,
        statusType: 'error',
        statusText: '2 operations failed',
        failedCount: 2,
      });

      const result = OfflineBanner();
      // RetryButton is rendered when statusType === 'error'
      const children = result.props.children;
      const hasRetryButton = children.some(
        (child: any) => child !== null && child !== false
      );
      expect(hasRetryButton).toBe(true);
    });

    test('does not show retry button for non-error statuses', () => {
      mockUseSyncStatus.mockReturnValue({
        ...defaultSyncStatus,
        isOnline: false,
        statusType: 'offline',
        statusText: 'Offline',
      });

      const result = OfflineBanner();
      const children = result.props.children;
      // The third child (index 2) is the retry button conditional
      // It should be false when statusType !== 'error'
      expect(children[2]).toBeFalsy();
    });
  });

  describe('SyncStatusBanner', () => {
    test('is exported and is a function', () => {
      expect(SyncStatusBanner).toBeDefined();
      expect(typeof SyncStatusBanner).toBe('function');
    });

    test('renders expanded banner structure', () => {
      mockUseSyncStatus.mockReturnValue({
        ...defaultSyncStatus,
        isOnline: true,
        statusType: 'synced',
        statusText: 'All changes synced',
      });

      const result = SyncStatusBanner();
      expect(result).not.toBeNull();
      expect(result.type).toBe('View');
    });

    test('displays "Never synced" when lastSyncedAt is null', () => {
      mockUseSyncStatus.mockReturnValue({
        ...defaultSyncStatus,
        lastSyncedAt: null,
      });

      const result = SyncStatusBanner();
      // Find the subtitle text that shows last sync time
      const expandedHeader = result.props.children[0];
      const expandedLeft = expandedHeader.props.children[0];
      const textContainer = expandedLeft.props.children[1];
      const subtitle = textContainer.props.children[1];
      expect(subtitle.props.children).toContain('Never synced');
    });

    test('displays "Just now" for recent sync', () => {
      mockUseSyncStatus.mockReturnValue({
        ...defaultSyncStatus,
        lastSyncedAt: new Date(), // Just now
      });

      const result = SyncStatusBanner();
      const expandedHeader = result.props.children[0];
      const expandedLeft = expandedHeader.props.children[0];
      const textContainer = expandedLeft.props.children[1];
      const subtitle = textContainer.props.children[1];
      expect(subtitle.props.children).toContain('Just now');
    });

    test('displays minutes ago for sync within an hour', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      mockUseSyncStatus.mockReturnValue({
        ...defaultSyncStatus,
        lastSyncedAt: fiveMinutesAgo,
      });

      const result = SyncStatusBanner();
      const expandedHeader = result.props.children[0];
      const expandedLeft = expandedHeader.props.children[0];
      const textContainer = expandedLeft.props.children[1];
      const subtitle = textContainer.props.children[1];
      expect(subtitle.props.children).toContain('m ago');
    });

    test('displays hours ago for sync within a day', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      mockUseSyncStatus.mockReturnValue({
        ...defaultSyncStatus,
        lastSyncedAt: twoHoursAgo,
      });

      const result = SyncStatusBanner();
      const expandedHeader = result.props.children[0];
      const expandedLeft = expandedHeader.props.children[0];
      const textContainer = expandedLeft.props.children[1];
      const subtitle = textContainer.props.children[1];
      expect(subtitle.props.children).toContain('h ago');
    });

    test('displays date for sync older than a day', () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      mockUseSyncStatus.mockReturnValue({
        ...defaultSyncStatus,
        lastSyncedAt: twoDaysAgo,
      });

      const result = SyncStatusBanner();
      const expandedHeader = result.props.children[0];
      const expandedLeft = expandedHeader.props.children[0];
      const textContainer = expandedLeft.props.children[1];
      const subtitle = textContainer.props.children[1];
      // Should contain a date string (locale dependent)
      expect(subtitle.props.children).toContain('Last synced:');
    });

    test('shows sync button when online with pending operations and not syncing', () => {
      mockUseSyncStatus.mockReturnValue({
        ...defaultSyncStatus,
        isOnline: true,
        isSyncing: false,
        pendingCount: 5,
        failedCount: 0,
        statusType: 'pending',
      });

      const result = SyncStatusBanner();
      const expandedHeader = result.props.children[0];
      // Second child of expandedHeader should be the sync button (conditional)
      expect(expandedHeader.props.children[1]).toBeTruthy();
    });

    test('does not show sync button when syncing', () => {
      mockUseSyncStatus.mockReturnValue({
        ...defaultSyncStatus,
        isOnline: true,
        isSyncing: true,
        pendingCount: 5,
        failedCount: 0,
        statusType: 'syncing',
      });

      const result = SyncStatusBanner();
      const expandedHeader = result.props.children[0];
      // Sync button should not render when isSyncing is true
      expect(expandedHeader.props.children[1]).toBeFalsy();
    });

    test('does not show sync button when offline', () => {
      mockUseSyncStatus.mockReturnValue({
        ...defaultSyncStatus,
        isOnline: false,
        isSyncing: false,
        pendingCount: 5,
        failedCount: 0,
        statusType: 'offline',
      });

      const result = SyncStatusBanner();
      const expandedHeader = result.props.children[0];
      expect(expandedHeader.props.children[1]).toBeFalsy();
    });

    test('calls sync when sync button pressed with pending changes', () => {
      const mockSync = jest.fn();
      mockUseSyncActions.mockReturnValue({
        sync: mockSync,
        retry: jest.fn(),
      });
      mockUseSyncStatus.mockReturnValue({
        ...defaultSyncStatus,
        isOnline: true,
        isSyncing: false,
        pendingCount: 3,
        failedCount: 0,
        statusType: 'pending',
      });

      const result = SyncStatusBanner();
      const expandedHeader = result.props.children[0];
      const syncButton = expandedHeader.props.children[1];

      // Simulate press
      syncButton.props.onPress();
      expect(mockSync).toHaveBeenCalled();
    });

    test('calls retry when sync button pressed with failed operations', () => {
      const mockRetry = jest.fn();
      mockUseSyncActions.mockReturnValue({
        sync: jest.fn(),
        retry: mockRetry,
      });
      mockUseSyncStatus.mockReturnValue({
        ...defaultSyncStatus,
        isOnline: true,
        isSyncing: false,
        pendingCount: 0,
        failedCount: 2,
        statusType: 'error',
      });

      const result = SyncStatusBanner();
      const expandedHeader = result.props.children[0];
      const syncButton = expandedHeader.props.children[1];

      // Simulate press
      syncButton.props.onPress();
      expect(mockRetry).toHaveBeenCalled();
    });

    test('shows stats row when pending count > 0', () => {
      mockUseSyncStatus.mockReturnValue({
        ...defaultSyncStatus,
        pendingCount: 3,
        failedCount: 0,
        statusType: 'pending',
      });

      const result = SyncStatusBanner();
      const statsRow = result.props.children[1];
      expect(statsRow).toBeTruthy();
    });

    test('shows stats row when failed count > 0', () => {
      mockUseSyncStatus.mockReturnValue({
        ...defaultSyncStatus,
        pendingCount: 0,
        failedCount: 2,
        statusType: 'error',
      });

      const result = SyncStatusBanner();
      const statsRow = result.props.children[1];
      expect(statsRow).toBeTruthy();
    });

    test('does not show stats row when no pending or failed operations', () => {
      mockUseSyncStatus.mockReturnValue({
        ...defaultSyncStatus,
        pendingCount: 0,
        failedCount: 0,
        statusType: 'synced',
      });

      const result = SyncStatusBanner();
      const statsRow = result.props.children[1];
      expect(statsRow).toBeFalsy();
    });

    test('shows both pending and failed counts in stats row', () => {
      mockUseSyncStatus.mockReturnValue({
        ...defaultSyncStatus,
        pendingCount: 3,
        failedCount: 2,
        statusType: 'error',
      });

      const result = SyncStatusBanner();
      const statsRow = result.props.children[1];
      expect(statsRow.props.children).toHaveLength(2);
    });
  });

  describe('SyncIndicator', () => {
    test('is exported and is a function', () => {
      expect(SyncIndicator).toBeDefined();
      expect(typeof SyncIndicator).toBe('function');
    });

    test('returns null when status is synced', () => {
      mockUseSyncStatus.mockReturnValue({
        ...defaultSyncStatus,
        statusType: 'synced',
      });

      const result = SyncIndicator();
      expect(result).toBeNull();
    });

    test('shows ActivityIndicator when syncing', () => {
      mockUseSyncStatus.mockReturnValue({
        ...defaultSyncStatus,
        statusType: 'syncing',
        isSyncing: true,
      });

      const result = SyncIndicator();
      expect(result).not.toBeNull();
      expect(result.type).toBe('View');
      // Child should be ActivityIndicator
      expect(result.props.children.type).toBe('ActivityIndicator');
    });

    test('shows WifiOff icon when offline', () => {
      mockUseSyncStatus.mockReturnValue({
        ...defaultSyncStatus,
        statusType: 'offline',
        isSyncing: false,
      });

      const result = SyncIndicator();
      expect(result).not.toBeNull();
      expect(result.props.children.type).toBe('WifiOff');
    });

    test('shows AlertCircle icon when error', () => {
      mockUseSyncStatus.mockReturnValue({
        ...defaultSyncStatus,
        statusType: 'error',
        isSyncing: false,
      });

      const result = SyncIndicator();
      expect(result).not.toBeNull();
      expect(result.props.children.type).toBe('AlertCircle');
    });

    test('shows pending badge with count when pending and not syncing', () => {
      mockUseSyncStatus.mockReturnValue({
        ...defaultSyncStatus,
        statusType: 'pending',
        isSyncing: false,
        pendingCount: 5,
      });

      const result = SyncIndicator();
      expect(result).not.toBeNull();
      // Should render pending badge (View)
      const badge = result.props.children;
      expect(badge.type).toBe('View');
      // Text should contain pending count
      expect(badge.props.children.props.children).toBe(5);
    });

    test('returns null child when status is unknown', () => {
      mockUseSyncStatus.mockReturnValue({
        ...defaultSyncStatus,
        statusType: 'unknown' as any,
        isSyncing: false,
        pendingCount: 0,
      });

      const result = SyncIndicator();
      expect(result).not.toBeNull();
      // View with null child
      expect(result.props.children).toBeNull();
    });
  });

  describe('StatusIcon (via OfflineBanner)', () => {
    test('renders WifiOff for offline status', () => {
      mockUseSyncStatus.mockReturnValue({
        ...defaultSyncStatus,
        isOnline: false,
        statusType: 'offline',
      });

      const result = OfflineBanner();
      const statusIcon = result.props.children[0];
      expect(statusIcon.type).toBe('WifiOff');
    });

    test('renders ActivityIndicator for syncing status', () => {
      mockUseSyncStatus.mockReturnValue({
        ...defaultSyncStatus,
        statusType: 'syncing',
        isSyncing: true,
      });

      const result = OfflineBanner();
      const statusIcon = result.props.children[0];
      expect(statusIcon.type).toBe('ActivityIndicator');
    });

    test('renders AlertCircle for error status', () => {
      mockUseSyncStatus.mockReturnValue({
        ...defaultSyncStatus,
        statusType: 'error',
        failedCount: 1,
      });

      const result = OfflineBanner();
      const statusIcon = result.props.children[0];
      expect(statusIcon.type).toBe('AlertCircle');
    });

    test('renders Cloud for pending status', () => {
      mockUseSyncStatus.mockReturnValue({
        ...defaultSyncStatus,
        statusType: 'pending',
        pendingCount: 2,
      });

      const result = OfflineBanner();
      const statusIcon = result.props.children[0];
      expect(statusIcon.type).toBe('Cloud');
    });
  });

  describe('StatusIcon (via SyncStatusBanner)', () => {
    test('renders CheckCircle for synced status', () => {
      mockUseSyncStatus.mockReturnValue({
        ...defaultSyncStatus,
        isOnline: true,
        statusType: 'synced',
        statusText: 'All changes synced',
      });

      const result = SyncStatusBanner();
      const expandedHeader = result.props.children[0];
      const expandedLeft = expandedHeader.props.children[0];
      const statusIcon = expandedLeft.props.children[0];
      expect(statusIcon.type).toBe('CheckCircle');
    });

    test('renders null for unknown status type', () => {
      mockUseSyncStatus.mockReturnValue({
        ...defaultSyncStatus,
        isOnline: false,
        statusType: 'unknown' as any,
        statusText: 'Unknown status',
      });

      const result = SyncStatusBanner();
      const expandedHeader = result.props.children[0];
      const expandedLeft = expandedHeader.props.children[0];
      const statusIcon = expandedLeft.props.children[0];
      expect(statusIcon).toBeNull();
    });

    test('renders Cloud for pending status in expanded banner', () => {
      mockUseSyncStatus.mockReturnValue({
        ...defaultSyncStatus,
        statusType: 'pending',
        pendingCount: 3,
        statusText: '3 changes pending',
      });

      const result = SyncStatusBanner();
      const expandedHeader = result.props.children[0];
      const expandedLeft = expandedHeader.props.children[0];
      const statusIcon = expandedLeft.props.children[0];
      expect(statusIcon.type).toBe('Cloud');
    });
  });

  describe('RetryButton (via OfflineBanner)', () => {
    test('calls retry action when pressed', () => {
      const mockRetry = jest.fn();
      mockUseSyncActions.mockReturnValue({
        sync: jest.fn(),
        retry: mockRetry,
      });
      mockUseSyncStatus.mockReturnValue({
        ...defaultSyncStatus,
        statusType: 'error',
        failedCount: 1,
      });

      const result = OfflineBanner();
      const retryButton = result.props.children[2];

      // Simulate press
      retryButton.props.onPress();
      expect(mockRetry).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    test('OfflineBanner handles zero pending with non-synced status', () => {
      mockUseSyncStatus.mockReturnValue({
        ...defaultSyncStatus,
        isOnline: false,
        statusType: 'offline',
        pendingCount: 0,
        failedCount: 0,
      });

      const result = OfflineBanner();
      expect(result).not.toBeNull();
    });

    test('SyncStatusBanner handles large pending counts', () => {
      mockUseSyncStatus.mockReturnValue({
        ...defaultSyncStatus,
        statusType: 'pending',
        pendingCount: 9999,
        failedCount: 0,
      });

      const result = SyncStatusBanner();
      expect(result).not.toBeNull();
    });

    test('SyncIndicator handles zero pending with pending status', () => {
      mockUseSyncStatus.mockReturnValue({
        ...defaultSyncStatus,
        statusType: 'pending',
        isSyncing: false,
        pendingCount: 0,
      });

      const result = SyncIndicator();
      expect(result).not.toBeNull();
      // With pendingCount 0, the badge should still render (View)
      const badge = result.props.children;
      expect(badge.type).toBe('View');
      expect(badge.props.children.props.children).toBe(0);
    });

    test('SyncStatusBanner with only pending operations', () => {
      mockUseSyncStatus.mockReturnValue({
        ...defaultSyncStatus,
        statusType: 'pending',
        pendingCount: 5,
        failedCount: 0,
      });

      const result = SyncStatusBanner();
      const statsRow = result.props.children[1];
      // Should have only pending stat item (failed one is conditional)
      const statsChildren = statsRow.props.children.filter(Boolean);
      expect(statsChildren.length).toBe(1);
    });

    test('SyncStatusBanner with only failed operations', () => {
      mockUseSyncStatus.mockReturnValue({
        ...defaultSyncStatus,
        statusType: 'error',
        pendingCount: 0,
        failedCount: 3,
      });

      const result = SyncStatusBanner();
      const statsRow = result.props.children[1];
      // Should have only failed stat item (pending one is conditional)
      const statsChildren = statsRow.props.children.filter(Boolean);
      expect(statsChildren.length).toBe(1);
    });

    test('SyncStatusBanner shows sync button when both pending and failed exist', () => {
      mockUseSyncStatus.mockReturnValue({
        ...defaultSyncStatus,
        isOnline: true,
        isSyncing: false,
        pendingCount: 2,
        failedCount: 3,
        statusType: 'error',
      });

      const result = SyncStatusBanner();
      const expandedHeader = result.props.children[0];
      // Sync button should render
      expect(expandedHeader.props.children[1]).toBeTruthy();
    });

    test('OfflineBanner renders when online but with pending status', () => {
      mockUseSyncStatus.mockReturnValue({
        ...defaultSyncStatus,
        isOnline: true,
        statusType: 'pending',
        statusText: '5 changes pending',
        pendingCount: 5,
      });

      const result = OfflineBanner();
      expect(result).not.toBeNull();
      expect(result.type).toBe('View');
    });

    test('OfflineBanner renders when online but with error status', () => {
      mockUseSyncStatus.mockReturnValue({
        ...defaultSyncStatus,
        isOnline: true,
        statusType: 'error',
        statusText: '2 operations failed',
        failedCount: 2,
      });

      const result = OfflineBanner();
      expect(result).not.toBeNull();
      expect(result.type).toBe('View');
    });

    test('SyncIndicator with syncing takes precedence over offline', () => {
      mockUseSyncStatus.mockReturnValue({
        ...defaultSyncStatus,
        statusType: 'offline',
        isSyncing: true,
        pendingCount: 3,
      });

      const result = SyncIndicator();
      expect(result).not.toBeNull();
      // isSyncing is checked first, so ActivityIndicator should render
      expect(result.props.children.type).toBe('ActivityIndicator');
    });

    test('SyncStatusBanner displays correct status text when syncing', () => {
      mockUseSyncStatus.mockReturnValue({
        ...defaultSyncStatus,
        statusType: 'syncing',
        isSyncing: true,
        statusText: 'Syncing...',
      });

      const result = SyncStatusBanner();
      const expandedHeader = result.props.children[0];
      const expandedLeft = expandedHeader.props.children[0];
      const textContainer = expandedLeft.props.children[1];
      const title = textContainer.props.children[0];
      expect(title.props.children).toBe('Syncing...');
    });

    test('SyncStatusBanner does not show sync button when no pending or failed', () => {
      mockUseSyncStatus.mockReturnValue({
        ...defaultSyncStatus,
        isOnline: true,
        isSyncing: false,
        pendingCount: 0,
        failedCount: 0,
        statusType: 'synced',
      });

      const result = SyncStatusBanner();
      const expandedHeader = result.props.children[0];
      // Sync button should not render when no pending or failed
      expect(expandedHeader.props.children[1]).toBeFalsy();
    });
  });

  describe('Style application', () => {
    test('OfflineBanner applies offline style class', () => {
      mockUseSyncStatus.mockReturnValue({
        ...defaultSyncStatus,
        isOnline: false,
        statusType: 'offline',
      });

      const result = OfflineBanner();
      // The style prop should include the statusType style
      expect(result.props.style).toContainEqual(expect.objectContaining({ backgroundColor: '#dc3545' }));
    });

    test('OfflineBanner applies syncing style class', () => {
      mockUseSyncStatus.mockReturnValue({
        ...defaultSyncStatus,
        statusType: 'syncing',
        isSyncing: true,
      });

      const result = OfflineBanner();
      expect(result.props.style).toContainEqual(expect.objectContaining({ backgroundColor: '#0d6efd' }));
    });

    test('OfflineBanner applies error style class', () => {
      mockUseSyncStatus.mockReturnValue({
        ...defaultSyncStatus,
        statusType: 'error',
        failedCount: 1,
      });

      const result = OfflineBanner();
      expect(result.props.style).toContainEqual(expect.objectContaining({ backgroundColor: '#dc3545' }));
    });

    test('OfflineBanner applies pending style class', () => {
      mockUseSyncStatus.mockReturnValue({
        ...defaultSyncStatus,
        statusType: 'pending',
        pendingCount: 1,
      });

      const result = OfflineBanner();
      expect(result.props.style).toContainEqual(expect.objectContaining({ backgroundColor: '#ffc107' }));
    });

    test('SyncStatusBanner applies correct style based on statusType', () => {
      mockUseSyncStatus.mockReturnValue({
        ...defaultSyncStatus,
        statusType: 'synced',
      });

      const result = SyncStatusBanner();
      expect(result.props.style).toContainEqual(expect.objectContaining({ backgroundColor: '#198754' }));
    });
  });
});
