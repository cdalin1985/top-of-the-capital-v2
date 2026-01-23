import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Modal, FlatList } from 'react-native';
import { supabase } from '../lib/supabase';
import { useGuestStore } from '../store/useGuestStore';
import { ChevronDown, User, Lock, Search, X, Check, Crown, Eye } from 'lucide-react-native';

interface LadderPlayer {
    id: string;
    full_name: string;
    ladder_rank: number;
    fargo_rating: number;
    avatar_url?: string;
}

type AuthMode = 'select' | 'register' | 'login';

export default function AuthScreen() {
    const [players, setPlayers] = useState<LadderPlayer[]>([]);
    const [loadingPlayers, setLoadingPlayers] = useState(true);
    const [selectedPlayer, setSelectedPlayer] = useState<LadderPlayer | null>(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [authMode, setAuthMode] = useState<AuthMode>('select');
    const [isExistingUser, setIsExistingUser] = useState(false);

    const setGuest = useGuestStore((state) => state.setGuest);

    // Fetch players from profiles on mount
    useEffect(() => {
        fetchPlayers();
    }, []);

    async function fetchPlayers() {
        setLoadingPlayers(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, ladder_rank, fargo_rating, avatar_url')
                .order('ladder_rank', { ascending: true })
                .limit(70);

            if (error) throw error;
            setPlayers(data || []);
        } catch (error: any) {
            console.error('Error fetching players:', error.message);
            Alert.alert('Error', 'Failed to load players. Please try again.');
        } finally {
            setLoadingPlayers(false);
        }
    }

    async function handlePlayerSelect(player: LadderPlayer) {
        setSelectedPlayer(player);
        setShowDropdown(false);
        setSearchQuery('');

        // Check if this player already has an owner (existing user)
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('owner_id')
                .eq('id', player.id)
                .single();

            if (error) throw error;

            if (data?.owner_id) {
                // Player has an account, show login mode
                setIsExistingUser(true);
                setAuthMode('login');
            } else {
                // New player, show registration mode
                setIsExistingUser(false);
                setAuthMode('register');
            }
        } catch (error: any) {
            Alert.alert('Error', 'Failed to check player status. Please try again.');
            setSelectedPlayer(null);
            setAuthMode('select');
        }
    }

    async function handleRegister() {
        if (!selectedPlayer) {
            Alert.alert('Error', 'Please select your player profile');
            return;
        }
        if (!email.trim()) {
            Alert.alert('Error', 'Please enter your email');
            return;
        }
        if (!password) {
            Alert.alert('Error', 'Please enter a password');
            return;
        }
        if (password.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters');
            return;
        }
        if (password !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }

        setLoading(true);
        try {
            // Create auth account
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: email.trim(),
                password,
                options: {
                    data: {
                        full_name: selectedPlayer.full_name,
                        player_id: selectedPlayer.id,
                    },
                },
            });

            if (authError) throw authError;

            if (authData.user) {
                // Link the player profile to the new user
                const { error: linkError } = await supabase
                    .from('profiles')
                    .update({ owner_id: authData.user.id })
                    .eq('id', selectedPlayer.id);

                if (linkError) {
                    console.error('Failed to link profile:', linkError);
                    // Don't throw - user is created, they can still use the app
                }
            }

            Alert.alert(
                'Welcome!',
                `Account created for ${selectedPlayer.full_name}!\n\nPlease check your email to confirm your account.`
            );
        } catch (error: any) {
            Alert.alert('Registration Failed', error.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleLogin() {
        if (!selectedPlayer) {
            Alert.alert('Error', 'Please select your player profile');
            return;
        }
        if (!email.trim()) {
            Alert.alert('Error', 'Please enter your email');
            return;
        }
        if (!password) {
            Alert.alert('Error', 'Please enter your password');
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password,
            });

            if (error) throw error;
            // Navigation will be handled by the auth state change listener
        } catch (error: any) {
            Alert.alert('Login Failed', error.message);
        } finally {
            setLoading(false);
        }
    }

    // Continue as guest (view-only mode)
    function handleContinueAsGuest() {
        setGuest('guest@local', '');
    }

    // Filter players based on search query
    const filteredPlayers = players.filter(player =>
        player.full_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderPlayerItem = ({ item }: { item: LadderPlayer }) => (
        <TouchableOpacity
            style={styles.playerItem}
            onPress={() => handlePlayerSelect(item)}
        >
            <View style={styles.playerRankBadge}>
                {item.ladder_rank === 1 ? (
                    <Crown size={14} color="#FFD700" />
                ) : (
                    <Text style={styles.playerRankText}>#{item.ladder_rank}</Text>
                )}
            </View>
            <View style={styles.playerInfo}>
                <Text style={styles.playerName}>{item.full_name}</Text>
                <Text style={styles.playerFargo}>Fargo {item.fargo_rating}</Text>
            </View>
            {selectedPlayer?.id === item.id && (
                <Check size={20} color="#87a96b" />
            )}
        </TouchableOpacity>
    );

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.card}>
                    {/* Header */}
                    <Text style={styles.title}>Top of the Capital</Text>
                    <Text style={styles.subtitle}>Pool Ladder League</Text>

                    {/* Player Selection Dropdown */}
                    <Text style={styles.sectionLabel}>Select Your Profile</Text>
                    <TouchableOpacity
                        style={styles.dropdown}
                        onPress={() => setShowDropdown(true)}
                        disabled={loadingPlayers}
                    >
                        {loadingPlayers ? (
                            <ActivityIndicator color="#87a96b" size="small" />
                        ) : selectedPlayer ? (
                            <View style={styles.selectedPlayer}>
                                <View style={styles.playerRankBadge}>
                                    {selectedPlayer.ladder_rank === 1 ? (
                                        <Crown size={14} color="#FFD700" />
                                    ) : (
                                        <Text style={styles.playerRankText}>#{selectedPlayer.ladder_rank}</Text>
                                    )}
                                </View>
                                <Text style={styles.selectedPlayerName}>{selectedPlayer.full_name}</Text>
                            </View>
                        ) : (
                            <View style={styles.placeholderRow}>
                                <User size={18} color="#666" />
                                <Text style={styles.placeholderText}>Choose your player...</Text>
                            </View>
                        )}
                        <ChevronDown size={20} color="#87a96b" />
                    </TouchableOpacity>

                    {/* Auth Form - shows after player selection */}
                    {authMode !== 'select' && selectedPlayer && (
                        <>
                            {/* Mode indicator */}
                            <View style={styles.modeIndicator}>
                                <View style={[styles.modeBadge, isExistingUser ? styles.loginBadge : styles.registerBadge]}>
                                    <Text style={styles.modeBadgeText}>
                                        {isExistingUser ? 'Existing Account' : 'New Account'}
                                    </Text>
                                </View>
                            </View>

                            {/* Email Input */}
                            <TextInput
                                style={styles.input}
                                placeholder="Email"
                                placeholderTextColor="#666"
                                autoCapitalize="none"
                                keyboardType="email-address"
                                value={email}
                                onChangeText={setEmail}
                            />

                            {/* Password Input */}
                            <View style={styles.passwordContainer}>
                                <Lock size={18} color="#666" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.inputWithIcon}
                                    placeholder="Password"
                                    placeholderTextColor="#666"
                                    secureTextEntry
                                    value={password}
                                    onChangeText={setPassword}
                                />
                            </View>

                            {/* Confirm Password for new users */}
                            {!isExistingUser && (
                                <View style={styles.passwordContainer}>
                                    <Lock size={18} color="#666" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.inputWithIcon}
                                        placeholder="Confirm Password"
                                        placeholderTextColor="#666"
                                        secureTextEntry
                                        value={confirmPassword}
                                        onChangeText={setConfirmPassword}
                                    />
                                </View>
                            )}

                            {/* Submit Button */}
                            <TouchableOpacity
                                style={[styles.button, loading && styles.buttonDisabled]}
                                onPress={isExistingUser ? handleLogin : handleRegister}
                                disabled={loading}
                            >
                                <Text style={styles.buttonText}>
                                    {loading ? 'Processing...' : (isExistingUser ? 'Sign In' : 'Create Account')}
                                </Text>
                            </TouchableOpacity>

                            {/* Help text */}
                            <Text style={styles.helpText}>
                                {isExistingUser
                                    ? 'Enter the email and password you used to create your account.'
                                    : 'Create a password to secure your profile. You\'ll use this to sign in.'}
                            </Text>

                            {/* Switch mode button for existing users who might be new */}
                            {isExistingUser && (
                                <TouchableOpacity
                                    onPress={() => {
                                        setIsExistingUser(false);
                                        setAuthMode('register');
                                    }}
                                >
                                    <Text style={styles.switchText}>
                                        First time signing up? Create a new account
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </>
                    )}

                    {/* Continue as Guest */}
                    <TouchableOpacity
                        style={styles.guestButton}
                        onPress={handleContinueAsGuest}
                    >
                        <Eye size={18} color="#666" />
                        <Text style={styles.guestButtonText}>Continue as Guest</Text>
                    </TouchableOpacity>
                    <Text style={styles.guestHelpText}>
                        Browse the leaderboard without signing in
                    </Text>
                </View>
            </ScrollView>

            {/* Player Selection Modal */}
            <Modal
                visible={showDropdown}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowDropdown(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Select Player</Text>
                        <TouchableOpacity
                            onPress={() => setShowDropdown(false)}
                            style={styles.closeButton}
                        >
                            <X size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    {/* Search Input */}
                    <View style={styles.searchContainer}>
                        <Search size={18} color="#666" style={styles.searchIcon} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search players..."
                            placeholderTextColor="#666"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            autoFocus
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <X size={18} color="#666" />
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Player List */}
                    <FlatList
                        data={filteredPlayers}
                        keyExtractor={(item) => item.id}
                        renderItem={renderPlayerItem}
                        contentContainerStyle={styles.playerList}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <Text style={styles.emptyText}>No players found</Text>
                        }
                    />

                    {/* Player count */}
                    <View style={styles.playerCount}>
                        <Text style={styles.playerCountText}>
                            {filteredPlayers.length} of {players.length} players
                        </Text>
                    </View>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a0a',
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 20,
    },
    card: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 20,
        padding: 30,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
        fontFamily: Platform.OS === 'ios' ? 'Cinzel Decorative' : 'serif',
    },
    subtitle: {
        fontSize: 14,
        color: '#87a96b',
        textAlign: 'center',
        marginBottom: 30,
        textTransform: 'uppercase',
        letterSpacing: 2,
    },
    sectionLabel: {
        color: '#888',
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        marginBottom: 8,
        letterSpacing: 1,
    },
    dropdown: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 12,
        padding: 15,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
        minHeight: 54,
    },
    selectedPlayer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    selectedPlayerName: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 10,
    },
    placeholderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    placeholderText: {
        color: '#666',
        fontSize: 16,
    },
    modeIndicator: {
        alignItems: 'center',
        marginBottom: 20,
    },
    modeBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    loginBadge: {
        backgroundColor: 'rgba(135, 169, 107, 0.2)',
    },
    registerBadge: {
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
    },
    modeBadgeText: {
        color: '#87a96b',
        fontSize: 12,
        fontWeight: '600',
    },
    input: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 12,
        padding: 15,
        marginBottom: 15,
        color: '#fff',
        fontSize: 16,
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 12,
        marginBottom: 15,
    },
    inputIcon: {
        marginLeft: 15,
    },
    inputWithIcon: {
        flex: 1,
        padding: 15,
        color: '#fff',
        fontSize: 16,
    },
    button: {
        backgroundColor: '#87a96b',
        borderRadius: 12,
        padding: 18,
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 15,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    buttonText: {
        color: '#000',
        fontSize: 18,
        fontWeight: 'bold',
    },
    helpText: {
        color: '#666',
        fontSize: 12,
        textAlign: 'center',
        lineHeight: 18,
    },
    switchText: {
        color: '#87a96b',
        textAlign: 'center',
        fontSize: 14,
        marginTop: 15,
    },
    guestButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        marginTop: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 12,
    },
    guestButtonText: {
        color: '#888',
        fontSize: 15,
        marginLeft: 8,
    },
    guestHelpText: {
        color: '#555',
        fontSize: 11,
        textAlign: 'center',
        marginTop: 8,
    },
    // Modal styles
    modalContainer: {
        flex: 1,
        backgroundColor: '#0a0a0a',
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        paddingTop: Platform.OS === 'ios' ? 60 : 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    modalTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    closeButton: {
        padding: 5,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 12,
        margin: 15,
        paddingHorizontal: 15,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        padding: 15,
        color: '#fff',
        fontSize: 16,
    },
    playerList: {
        padding: 15,
        paddingTop: 5,
    },
    playerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    playerRankBadge: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(135, 169, 107, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    playerRankText: {
        color: '#87a96b',
        fontSize: 11,
        fontWeight: 'bold',
    },
    playerInfo: {
        flex: 1,
        marginLeft: 12,
    },
    playerName: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    playerFargo: {
        color: '#666',
        fontSize: 12,
        marginTop: 2,
    },
    emptyText: {
        color: '#666',
        textAlign: 'center',
        marginTop: 40,
        fontSize: 16,
    },
    playerCount: {
        padding: 15,
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.1)',
    },
    playerCountText: {
        color: '#666',
        fontSize: 12,
    },
});
