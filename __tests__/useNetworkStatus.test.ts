/**
 * Tests for useNetworkStatus hook
 *
 * Tests the network status hook that monitors connectivity using @react-native-community/netinfo.
 * Covers initial state, event listener setup, state updates, and cleanup.
 */

import { NetInfoState } from '@react-native-community/netinfo';

// Mock NetInfo before importing the hook
const mockUnsubscribe = jest.fn();
let eventListenerCallback: ((state: NetInfoState) => void) | null = null;
let fetchResolver: ((state: Partial<NetInfoState>) => void) | null = null;

const mockAddEventListener = jest.fn().mockImplementation((callback) => {
    eventListenerCallback = callback;
    return mockUnsubscribe;
});

const mockFetch = jest.fn().mockImplementation(() => {
    return new Promise((resolve) => {
        fetchResolver = resolve;
    });
});

jest.mock('@react-native-community/netinfo', () => ({
    addEventListener: mockAddEventListener,
    fetch: mockFetch,
}));

// Mock React hooks
let currentState: { isConnected: boolean } = { isConnected: true };
let setIsConnectedCallback: ((value: boolean) => void) | null = null;
let effectCleanup: (() => void) | null = null;

const mockUseState = jest.fn().mockImplementation((initial) => {
    currentState.isConnected = initial;
    const setState = (newValue: boolean) => {
        currentState.isConnected = newValue;
    };
    setIsConnectedCallback = setState;
    return [currentState.isConnected, setState];
});

const mockUseEffect = jest.fn().mockImplementation((effect) => {
    const cleanup = effect();
    effectCleanup = cleanup;
});

jest.mock('react', () => ({
    useState: (...args: any[]) => mockUseState(...args),
    useEffect: (...args: any[]) => mockUseEffect(...args),
}));

describe('useNetworkStatus Hook', () => {
    let useNetworkStatus: typeof import('../src/hooks/useNetworkStatus').useNetworkStatus;

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();

        // Reset state
        currentState = { isConnected: true };
        eventListenerCallback = null;
        fetchResolver = null;
        effectCleanup = null;
        setIsConnectedCallback = null;

        // Reset useState mock for fresh calls
        mockUseState.mockReset();
        mockUseState.mockImplementation((initial) => {
            currentState.isConnected = initial;
            const setState = (newValue: boolean) => {
                currentState.isConnected = newValue;
            };
            setIsConnectedCallback = setState;
            return [currentState.isConnected, setState];
        });

        // Re-import to get fresh hook
        jest.isolateModules(() => {
            useNetworkStatus = require('../src/hooks/useNetworkStatus').useNetworkStatus;
        });
    });

    afterEach(() => {
        // Call cleanup if it exists
        if (effectCleanup) {
            effectCleanup();
        }
    });

    describe('Initial State', () => {
        test('returns isConnected as true initially', () => {
            const result = useNetworkStatus();
            expect(result.isConnected).toBe(true);
        });

        test('calls useState once with true as initial value', () => {
            useNetworkStatus();
            expect(mockUseState).toHaveBeenCalledTimes(1);
            expect(mockUseState).toHaveBeenCalledWith(true);
        });

        test('returns an object with isConnected property', () => {
            const result = useNetworkStatus();
            expect(result).toHaveProperty('isConnected');
        });

        test('returns exactly one property', () => {
            const result = useNetworkStatus();
            expect(Object.keys(result)).toHaveLength(1);
        });

        test('isConnected property is a boolean', () => {
            const result = useNetworkStatus();
            expect(typeof result.isConnected).toBe('boolean');
        });
    });

    describe('useEffect Setup', () => {
        test('calls useEffect on mount', () => {
            useNetworkStatus();
            expect(mockUseEffect).toHaveBeenCalled();
        });

        test('useEffect is called with empty dependency array', () => {
            useNetworkStatus();
            expect(mockUseEffect).toHaveBeenCalledWith(expect.any(Function), []);
        });

        test('sets up event listener via NetInfo.addEventListener', () => {
            useNetworkStatus();
            expect(mockAddEventListener).toHaveBeenCalled();
        });

        test('passes callback to addEventListener', () => {
            useNetworkStatus();
            expect(mockAddEventListener).toHaveBeenCalledWith(expect.any(Function));
        });

        test('calls NetInfo.fetch to check initial state', () => {
            useNetworkStatus();
            expect(mockFetch).toHaveBeenCalled();
        });
    });

    describe('Event Listener Behavior', () => {
        test('updates isConnected to true when network is connected', () => {
            currentState.isConnected = false; // Start as disconnected
            useNetworkStatus();

            // Simulate network state change to connected
            if (eventListenerCallback) {
                eventListenerCallback({ isConnected: true } as NetInfoState);
            }

            expect(currentState.isConnected).toBe(true);
        });

        test('updates isConnected to false when network is disconnected', () => {
            useNetworkStatus();

            // Simulate network state change to disconnected
            if (eventListenerCallback) {
                eventListenerCallback({ isConnected: false } as NetInfoState);
            }

            expect(currentState.isConnected).toBe(false);
        });

        test('handles null isConnected from NetInfo by defaulting to true', () => {
            useNetworkStatus();

            // Simulate network state with null isConnected (can happen during initialization)
            if (eventListenerCallback) {
                eventListenerCallback({ isConnected: null } as NetInfoState);
            }

            expect(currentState.isConnected).toBe(true);
        });

        test('handles undefined isConnected from NetInfo by defaulting to true', () => {
            useNetworkStatus();

            // Simulate network state with undefined isConnected
            if (eventListenerCallback) {
                eventListenerCallback({ isConnected: undefined } as unknown as NetInfoState);
            }

            expect(currentState.isConnected).toBe(true);
        });

        test('handles multiple rapid state changes', () => {
            useNetworkStatus();

            // Simulate rapid network changes
            if (eventListenerCallback) {
                eventListenerCallback({ isConnected: false } as NetInfoState);
                eventListenerCallback({ isConnected: true } as NetInfoState);
                eventListenerCallback({ isConnected: false } as NetInfoState);
                eventListenerCallback({ isConnected: true } as NetInfoState);
            }

            // Should reflect the last state
            expect(currentState.isConnected).toBe(true);
        });
    });

    describe('Initial Fetch Behavior', () => {
        test('updates isConnected when fetch resolves with connected state', async () => {
            currentState.isConnected = false; // Start as disconnected
            useNetworkStatus();

            // Resolve fetch with connected state
            if (fetchResolver) {
                fetchResolver({ isConnected: true });
            }

            // Wait for promise to resolve
            await new Promise(resolve => setTimeout(resolve, 0));

            expect(currentState.isConnected).toBe(true);
        });

        test('updates isConnected to false when fetch resolves with disconnected state', async () => {
            useNetworkStatus();

            // Resolve fetch with disconnected state
            if (fetchResolver) {
                fetchResolver({ isConnected: false });
            }

            // Wait for promise to resolve
            await new Promise(resolve => setTimeout(resolve, 0));

            expect(currentState.isConnected).toBe(false);
        });

        test('handles null isConnected in fetch response by defaulting to true', async () => {
            useNetworkStatus();

            // Resolve fetch with null isConnected
            if (fetchResolver) {
                fetchResolver({ isConnected: null });
            }

            // Wait for promise to resolve
            await new Promise(resolve => setTimeout(resolve, 0));

            expect(currentState.isConnected).toBe(true);
        });

        test('handles undefined isConnected in fetch response by defaulting to true', async () => {
            useNetworkStatus();

            // Resolve fetch with undefined isConnected
            if (fetchResolver) {
                fetchResolver({ isConnected: undefined });
            }

            // Wait for promise to resolve
            await new Promise(resolve => setTimeout(resolve, 0));

            expect(currentState.isConnected).toBe(true);
        });
    });

    describe('Cleanup', () => {
        test('returns cleanup function from useEffect', () => {
            useNetworkStatus();
            expect(effectCleanup).toBeDefined();
            expect(typeof effectCleanup).toBe('function');
        });

        test('calls unsubscribe on cleanup', () => {
            useNetworkStatus();

            // Execute cleanup
            if (effectCleanup) {
                effectCleanup();
            }

            expect(mockUnsubscribe).toHaveBeenCalled();
        });

        test('unsubscribe is called only once on cleanup', () => {
            useNetworkStatus();

            if (effectCleanup) {
                effectCleanup();
            }

            expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
        });
    });

    describe('Edge Cases', () => {
        test('handles event listener callback before fetch resolves', async () => {
            useNetworkStatus();

            // Event listener fires first (disconnected)
            if (eventListenerCallback) {
                eventListenerCallback({ isConnected: false } as NetInfoState);
            }

            expect(currentState.isConnected).toBe(false);

            // Then fetch resolves (connected)
            if (fetchResolver) {
                fetchResolver({ isConnected: true });
            }

            await new Promise(resolve => setTimeout(resolve, 0));

            // Fetch result overwrites event listener result
            expect(currentState.isConnected).toBe(true);
        });

        test('handles fetch resolving before event listener fires', async () => {
            useNetworkStatus();

            // Fetch resolves first (connected)
            if (fetchResolver) {
                fetchResolver({ isConnected: true });
            }

            await new Promise(resolve => setTimeout(resolve, 0));

            expect(currentState.isConnected).toBe(true);

            // Then event listener fires (disconnected)
            if (eventListenerCallback) {
                eventListenerCallback({ isConnected: false } as NetInfoState);
            }

            // Event listener result is the latest
            expect(currentState.isConnected).toBe(false);
        });

        test('handles NetInfoState with additional properties', () => {
            useNetworkStatus();

            // Simulate full NetInfoState object
            if (eventListenerCallback) {
                eventListenerCallback({
                    isConnected: true,
                    isInternetReachable: true,
                    type: 'wifi',
                    details: {
                        isConnectionExpensive: false,
                    },
                } as unknown as NetInfoState);
            }

            expect(currentState.isConnected).toBe(true);
        });

        test('handles alternating online/offline states', () => {
            useNetworkStatus();

            const states: boolean[] = [];

            // Capture state changes
            const originalSetState = setIsConnectedCallback;
            setIsConnectedCallback = (value) => {
                states.push(value);
                if (originalSetState) originalSetState(value);
            };

            // Simulate alternating states
            if (eventListenerCallback) {
                eventListenerCallback({ isConnected: true } as NetInfoState);
                eventListenerCallback({ isConnected: false } as NetInfoState);
                eventListenerCallback({ isConnected: true } as NetInfoState);
            }

            expect(states).toContain(true);
            expect(states).toContain(false);
        });
    });

    describe('Return Value Structure', () => {
        test('returns an object with only isConnected property', () => {
            const result = useNetworkStatus();

            expect(result).toHaveProperty('isConnected');
            expect(Object.keys(result)).toEqual(['isConnected']);
        });

        test('isConnected is accessible after state updates', () => {
            useNetworkStatus();

            // Update state
            if (eventListenerCallback) {
                eventListenerCallback({ isConnected: false } as NetInfoState);
            }

            // The current state should reflect the update
            expect(currentState.isConnected).toBe(false);
        });
    });

    describe('Concurrent Updates', () => {
        test('handles concurrent event and fetch updates gracefully', async () => {
            useNetworkStatus();

            // Simulate concurrent updates
            if (eventListenerCallback) {
                eventListenerCallback({ isConnected: false } as NetInfoState);
            }

            if (fetchResolver) {
                fetchResolver({ isConnected: true });
            }

            // Allow both to process
            await new Promise(resolve => setTimeout(resolve, 10));

            // State should be defined (either true or false, not undefined)
            expect(typeof currentState.isConnected).toBe('boolean');
        });

        test('handles multiple hooks being mounted', () => {
            // First hook
            useNetworkStatus();

            // Reset mocks to track second call
            const firstListenerCallback = eventListenerCallback;

            // Simulate second hook mount (re-import)
            jest.isolateModules(() => {
                const secondHook = require('../src/hooks/useNetworkStatus').useNetworkStatus;
                secondHook();
            });

            // Both should have set up listeners
            expect(mockAddEventListener).toHaveBeenCalledTimes(2);
        });
    });
});

describe('useNetworkStatus Hook Export', () => {
    test('exports useNetworkStatus function', () => {
        jest.isolateModules(() => {
            const { useNetworkStatus } = require('../src/hooks/useNetworkStatus');
            expect(useNetworkStatus).toBeDefined();
            expect(typeof useNetworkStatus).toBe('function');
        });
    });

    test('useNetworkStatus is a named export', () => {
        jest.isolateModules(() => {
            const networkModule = require('../src/hooks/useNetworkStatus');
            expect(networkModule).toHaveProperty('useNetworkStatus');
        });
    });

    test('module does not have a default export', () => {
        jest.isolateModules(() => {
            const networkModule = require('../src/hooks/useNetworkStatus');
            // Should only have useNetworkStatus as named export
            expect(networkModule.default).toBeUndefined();
        });
    });
});
