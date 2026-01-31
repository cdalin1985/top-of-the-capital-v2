/**
 * Tests for useAuth hook
 *
 * Tests the authentication hook that manages Supabase session state.
 * Covers initial loading, session management, and auth state changes.
 */

import { Session, User } from '@supabase/supabase-js';

// Mock session data for testing
const mockUser: Partial<User> = {
    id: 'test-user-id',
    email: 'test@example.com',
    created_at: '2024-01-01T00:00:00.000Z',
};

const mockSession: Partial<Session> = {
    user: mockUser as User,
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
};

// Mock subscription for onAuthStateChange
const mockUnsubscribe = jest.fn();
const mockSubscription = {
    unsubscribe: mockUnsubscribe,
};

// Mock getSession and onAuthStateChange
let getSessionResolver: ((value: { data: { session: Session | null } }) => void) | null = null;
let authStateChangeCallback: ((event: string, session: Session | null) => void) | null = null;

const mockGetSession = jest.fn().mockImplementation(() => {
    return new Promise((resolve) => {
        getSessionResolver = resolve;
    });
});

const mockOnAuthStateChange = jest.fn().mockImplementation((callback) => {
    authStateChangeCallback = callback;
    return { data: { subscription: mockSubscription } };
});

// Mock supabase before importing the hook
jest.mock('../src/lib/supabase', () => ({
    supabase: {
        auth: {
            getSession: mockGetSession,
            onAuthStateChange: mockOnAuthStateChange,
        },
    },
}));

// Mock React hooks
let currentState: { session: Session | null; loading: boolean } = {
    session: null,
    loading: true,
};

let setSessionCallback: ((session: Session | null) => void) | null = null;
let setLoadingCallback: ((loading: boolean) => void) | null = null;
let effectCleanup: (() => void) | null = null;

const mockUseState = jest.fn()
    .mockImplementationOnce((initial) => {
        currentState.session = initial;
        const setState = (newSession: Session | null) => {
            currentState.session = newSession;
            if (setSessionCallback) setSessionCallback(newSession);
        };
        setSessionCallback = setState;
        return [initial, setState];
    })
    .mockImplementationOnce((initial) => {
        currentState.loading = initial;
        const setState = (newLoading: boolean) => {
            currentState.loading = newLoading;
            if (setLoadingCallback) setLoadingCallback(newLoading);
        };
        setLoadingCallback = setState;
        return [initial, setState];
    });

const mockUseEffect = jest.fn().mockImplementation((effect) => {
    const cleanup = effect();
    effectCleanup = cleanup;
});

jest.mock('react', () => ({
    useState: (...args: any[]) => mockUseState(...args),
    useEffect: (...args: any[]) => mockUseEffect(...args),
}));

describe('useAuth Hook', () => {
    let useAuth: typeof import('../src/hooks/useAuth').useAuth;

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();

        // Reset state
        currentState = { session: null, loading: true };
        getSessionResolver = null;
        authStateChangeCallback = null;
        effectCleanup = null;
        setSessionCallback = null;
        setLoadingCallback = null;

        // Reset useState mock for fresh calls
        mockUseState.mockReset();
        mockUseState
            .mockImplementationOnce((initial) => {
                currentState.session = initial;
                const setState = (newSession: Session | null) => {
                    currentState.session = newSession;
                };
                setSessionCallback = setState as any;
                return [currentState.session, setState];
            })
            .mockImplementationOnce((initial) => {
                currentState.loading = initial;
                const setState = (newLoading: boolean) => {
                    currentState.loading = newLoading;
                };
                setLoadingCallback = setState as any;
                return [currentState.loading, setState];
            });

        // Re-import to get fresh hook
        jest.isolateModules(() => {
            useAuth = require('../src/hooks/useAuth').useAuth;
        });
    });

    afterEach(() => {
        // Call cleanup if it exists
        if (effectCleanup) {
            effectCleanup();
        }
    });

    describe('Initial State', () => {
        test('returns session as null initially', () => {
            const result = useAuth();
            expect(result.session).toBeNull();
        });

        test('returns loading as true initially', () => {
            const result = useAuth();
            expect(result.loading).toBe(true);
        });

        test('calls useState twice (for session and loading)', () => {
            useAuth();
            expect(mockUseState).toHaveBeenCalledTimes(2);
        });

        test('initializes session state with null', () => {
            useAuth();
            expect(mockUseState).toHaveBeenNthCalledWith(1, null);
        });

        test('initializes loading state with true', () => {
            useAuth();
            expect(mockUseState).toHaveBeenNthCalledWith(2, true);
        });
    });

    describe('useEffect Setup', () => {
        test('calls useEffect on mount', () => {
            useAuth();
            expect(mockUseEffect).toHaveBeenCalled();
        });

        test('useEffect is called with empty dependency array', () => {
            useAuth();
            expect(mockUseEffect).toHaveBeenCalledWith(expect.any(Function), []);
        });

        test('calls getSession on mount', () => {
            useAuth();
            expect(mockGetSession).toHaveBeenCalled();
        });

        test('sets up auth state change listener', () => {
            useAuth();
            expect(mockOnAuthStateChange).toHaveBeenCalled();
        });

        test('passes callback to onAuthStateChange', () => {
            useAuth();
            expect(mockOnAuthStateChange).toHaveBeenCalledWith(expect.any(Function));
        });
    });

    describe('getSession Behavior', () => {
        test('updates session when getSession resolves with valid session', async () => {
            useAuth();

            // Resolve getSession with a mock session
            if (getSessionResolver) {
                getSessionResolver({ data: { session: mockSession as Session } });
            }

            // Wait for promise to resolve
            await new Promise(resolve => setTimeout(resolve, 0));

            expect(currentState.session).toEqual(mockSession);
        });

        test('updates loading to false after getSession resolves', async () => {
            useAuth();

            // Initially loading should be true
            expect(currentState.loading).toBe(true);

            // Resolve getSession
            if (getSessionResolver) {
                getSessionResolver({ data: { session: mockSession as Session } });
            }

            // Wait for promise to resolve
            await new Promise(resolve => setTimeout(resolve, 0));

            expect(currentState.loading).toBe(false);
        });

        test('sets session to null when getSession returns no session', async () => {
            useAuth();

            // Resolve getSession with null session
            if (getSessionResolver) {
                getSessionResolver({ data: { session: null } });
            }

            // Wait for promise to resolve
            await new Promise(resolve => setTimeout(resolve, 0));

            expect(currentState.session).toBeNull();
        });

        test('sets loading to false even when session is null', async () => {
            useAuth();

            // Resolve getSession with null session
            if (getSessionResolver) {
                getSessionResolver({ data: { session: null } });
            }

            // Wait for promise to resolve
            await new Promise(resolve => setTimeout(resolve, 0));

            expect(currentState.loading).toBe(false);
        });
    });

    describe('Auth State Change Listener', () => {
        test('updates session when auth state changes', () => {
            useAuth();

            // Simulate auth state change
            if (authStateChangeCallback) {
                authStateChangeCallback('SIGNED_IN', mockSession as Session);
            }

            expect(currentState.session).toEqual(mockSession);
        });

        test('clears session on SIGNED_OUT event', () => {
            // Set initial session
            currentState.session = mockSession as Session;

            useAuth();

            // Simulate sign out
            if (authStateChangeCallback) {
                authStateChangeCallback('SIGNED_OUT', null);
            }

            expect(currentState.session).toBeNull();
        });

        test('handles TOKEN_REFRESHED event', () => {
            useAuth();

            const refreshedSession = {
                ...mockSession,
                access_token: 'new-refreshed-token',
            } as Session;

            if (authStateChangeCallback) {
                authStateChangeCallback('TOKEN_REFRESHED', refreshedSession);
            }

            expect(currentState.session).toEqual(refreshedSession);
        });

        test('handles USER_UPDATED event', () => {
            useAuth();

            const updatedSession = {
                ...mockSession,
                user: { ...mockUser, email: 'updated@example.com' },
            } as Session;

            if (authStateChangeCallback) {
                authStateChangeCallback('USER_UPDATED', updatedSession);
            }

            expect(currentState.session).toEqual(updatedSession);
        });
    });

    describe('Cleanup', () => {
        test('returns cleanup function from useEffect', () => {
            useAuth();
            expect(effectCleanup).toBeDefined();
            expect(typeof effectCleanup).toBe('function');
        });

        test('calls unsubscribe on cleanup', () => {
            useAuth();

            // Execute cleanup
            if (effectCleanup) {
                effectCleanup();
            }

            expect(mockUnsubscribe).toHaveBeenCalled();
        });

        test('unsubscribe is called only once on cleanup', () => {
            useAuth();

            if (effectCleanup) {
                effectCleanup();
            }

            expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
        });
    });

    describe('Return Value Structure', () => {
        test('returns an object with session and loading properties', () => {
            const result = useAuth();

            expect(result).toHaveProperty('session');
            expect(result).toHaveProperty('loading');
        });

        test('returns exactly two properties', () => {
            const result = useAuth();

            expect(Object.keys(result)).toHaveLength(2);
        });

        test('session property is of correct type', () => {
            const result = useAuth();

            // Initial value should be null
            expect(result.session).toBeNull();
        });

        test('loading property is a boolean', () => {
            const result = useAuth();

            expect(typeof result.loading).toBe('boolean');
        });
    });

    describe('Edge Cases', () => {
        test('handles multiple rapid auth state changes', () => {
            useAuth();

            // Simulate rapid changes
            if (authStateChangeCallback) {
                authStateChangeCallback('SIGNED_IN', mockSession as Session);
                authStateChangeCallback('TOKEN_REFRESHED', { ...mockSession, access_token: 'token2' } as Session);
                authStateChangeCallback('SIGNED_OUT', null);
                authStateChangeCallback('SIGNED_IN', { ...mockSession, access_token: 'token3' } as Session);
            }

            // Should reflect the last state
            expect(currentState.session).toEqual({ ...mockSession, access_token: 'token3' });
        });

        test('handles auth state change before getSession resolves', async () => {
            useAuth();

            // Auth state changes before getSession resolves
            if (authStateChangeCallback) {
                authStateChangeCallback('SIGNED_IN', mockSession as Session);
            }

            expect(currentState.session).toEqual(mockSession);

            // Now getSession resolves with different data
            if (getSessionResolver) {
                getSessionResolver({ data: { session: null } });
            }

            await new Promise(resolve => setTimeout(resolve, 0));

            // The last setSession call wins (from getSession)
            expect(currentState.session).toBeNull();
        });

        test('handles undefined event type gracefully', () => {
            useAuth();

            // Simulate unknown event
            if (authStateChangeCallback) {
                expect(() => {
                    authStateChangeCallback('UNKNOWN_EVENT' as any, mockSession as Session);
                }).not.toThrow();
            }
        });
    });

    describe('Session Data Integrity', () => {
        test('preserves user data in session', async () => {
            useAuth();

            if (getSessionResolver) {
                getSessionResolver({ data: { session: mockSession as Session } });
            }

            await new Promise(resolve => setTimeout(resolve, 0));

            expect(currentState.session?.user?.id).toBe('test-user-id');
            expect(currentState.session?.user?.email).toBe('test@example.com');
        });

        test('preserves tokens in session', async () => {
            useAuth();

            if (getSessionResolver) {
                getSessionResolver({ data: { session: mockSession as Session } });
            }

            await new Promise(resolve => setTimeout(resolve, 0));

            expect(currentState.session?.access_token).toBe('mock-access-token');
            expect(currentState.session?.refresh_token).toBe('mock-refresh-token');
        });

        test('preserves expiration time in session', async () => {
            useAuth();

            if (getSessionResolver) {
                getSessionResolver({ data: { session: mockSession as Session } });
            }

            await new Promise(resolve => setTimeout(resolve, 0));

            expect(currentState.session?.expires_at).toBeDefined();
            expect(typeof currentState.session?.expires_at).toBe('number');
        });
    });
});

describe('useAuth Hook Export', () => {
    test('exports useAuth function', () => {
        jest.isolateModules(() => {
            const { useAuth } = require('../src/hooks/useAuth');
            expect(useAuth).toBeDefined();
            expect(typeof useAuth).toBe('function');
        });
    });

    test('useAuth is a named export', () => {
        jest.isolateModules(() => {
            const authModule = require('../src/hooks/useAuth');
            expect(authModule).toHaveProperty('useAuth');
        });
    });
});
