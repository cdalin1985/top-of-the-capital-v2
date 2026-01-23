import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { useGuestStore } from '../store/useGuestStore';
import { Profile, GameType } from '../types';
import { Trophy, Swords, TrendingUp, AlertCircle } from 'lucide-react-native';
import { SkeletonRankingItem } from '../components/SkeletonLoader';
import { checkChallengeEligibility } from '../lib/logic';

interface PlayerWithStats extends Profile {
    wins: number;
    losses: number;
    winRate: number;
}

export default function LeaderboardScreen({ navigation }: any) {
    const [players, setPlayers] = useState<PlayerWithStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [gameType, setGameType] = useState<GameType>('8-ball');
    const [activeMatches, setActiveMatches] = useState<string[]>([]);
    const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null);
    const [fetchError, setFetchError] = useState<string | null>(null);

    const isGuest = useGuestStore((state) => state.isGuest);

    async function fetchLeaderboard(isRefresh = false) {
        if (isRefresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        try {
            // Get current user's profile
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profileData } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('owner_id', user.id)
                    .single();
                if (profileData) {
                    setCurrentUserProfile(profileData);
                }
            }

            // Fetch all players ordered by rank
            const { data: profilesData, error: profilesError } = await supabase
                .from('profiles')
                .select('*')
                .order('ladder_rank', { ascending: true });

            if (profilesError) throw profilesError;

            // Fetch all completed challenges to calculate win rates
            const { data: challengesData, error: challengesError } = await supabase
                .from('challenges')
                .select('challenger_id, challenged_id, winner_id')
                .eq('status', 'completed');

            if (challengesError) throw challengesError;

            // Calculate win rates for each player
            const playersWithStats: PlayerWithStats[] = (profilesData || []).map(profile => {
                const playerChallenges = (challengesData || []).filter(
                    c => c.challenger_id === profile.id || c.challenged_id === profile.id
                );
                const wins = playerChallenges.filter(c => c.winner_id === profile.id).length;
                const losses = playerChallenges.length - wins;
                const winRate = playerChallenges.length > 0
                    ? Math.round((wins / playerChallenges.length) * 100)
                    : 0;

                return {
                    ...profile,
                    wins,
                    losses,
                    winRate,
                };
            });

            setPlayers(playersWithStats);

            // Fetch active matches
            const { data: liveMatches } = await supabase
                .from('challenges')
                .select('challenger_id, challenged_id')
                .eq('status', 'live');

            const playingIds = (liveMatches || []).flatMap(m => [m.challenger_id, m.challenged_id]);
            setActiveMatches(playingIds);

        } catch (error: any) {
            console.error('Error fetching leaderboard:', error.message);
            // Check if this is an RLS error
            if (error.code === '42501' || error.message?.includes('permission denied')) {
                setFetchError('Unable to load leaderboard. Please sign in to view player rankings.');
            } else {
                setFetchError('Failed to load leaderboard. Pull down to refresh.');
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }

    useEffect(() => {
        fetchLeaderboard();

        // Real-time subscription for changes
        const channel = supabase
            .channel('leaderboard-changes')
            .on(
                'postgres_changes' as any,
                { event: '*', table: 'profiles' },
                () => fetchLeaderboard()
            )
            .on(
                'postgres_changes' as any,
                { event: '*', table: 'challenges' },
                () => fetchLeaderboard()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const canChallenge = (targetRank: number): boolean => {
        if (!currentUserProfile) return false;

        const eligibility = checkChallengeEligibility(
            currentUserProfile.ladder_rank,
            targetRank,
            currentUserProfile.cooldown_until || null
        );

        return eligibility.eligible;
    };

    const renderHeader = () => (
        <View>
            <View style={styles.mainHeader}>
                <TrendingUp color="#87a96b" size={32} />
                <Text style={styles.title}>LEADERBOARD</Text>
            </View>

            <View style={styles.statsBar}>
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>70</Text>
                    <Text style={styles.statLabel}>Players</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>{activeMatches.length / 2}</Text>
                    <Text style={styles.statLabel}>Live Matches</Text>
                </View>
                {currentUserProfile && (
                    <>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statValueHighlight}>#{currentUserProfile.ladder_rank}</Text>
                            <Text style={styles.statLabel}>Your Rank</Text>
                        </View>
                    </>
                )}
            </View>

            <View style={styles.tabContainer}>
                {(['8-ball', '9-ball', '10-ball'] as GameType[]).map((t) => (
                    <TouchableOpacity
                        key={t}
                        style={[styles.tab, gameType === t && styles.activeTab]}
                        onPress={() => setGameType(t)}
                        accessibilityLabel={`Select ${t}`}
                    >
                        <Text style={[styles.tabText, gameType === t && styles.activeTabText]}>
                            {t.toUpperCase()}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <View style={styles.headerRow}>
                <Text style={styles.headerCol}>RANK</Text>
                <Text style={[styles.headerCol, { flex: 1, textAlign: 'left', marginLeft: 15 }]}>PLAYER</Text>
                <Text style={styles.headerCol}>WIN RATE</Text>
                <Text style={[styles.headerCol, { width: 60 }]}>ACTION</Text>
            </View>
        </View>
    );

    const renderSkeletons = () => (
        <View>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <SkeletonRankingItem key={i} />
            ))}
        </View>
    );

    const renderItem = ({ item }: { item: PlayerWithStats }) => {
        const isPlaying = activeMatches.includes(item.id);
        const isCurrentUser = currentUserProfile?.id === item.id;
        const challengeEnabled = !isPlaying && !isCurrentUser && canChallenge(item.ladder_rank);

        // Determine win rate color based on percentage
        const getWinRateColor = (rate: number) => {
            if (rate >= 70) return '#4caf50'; // Green for high win rate
            if (rate >= 50) return '#ff9800'; // Orange for medium
            return '#f44336'; // Red for low
        };

        return (
            <View
                style={[
                    styles.rankingItem,
                    isPlaying && styles.playingItem,
                    isCurrentUser && styles.currentUserItem
                ]}
            >
                <View style={[
                    styles.rankContainer,
                    item.ladder_rank <= 3 && styles.topThreeRank
                ]}>
                    {item.ladder_rank <= 3 ? (
                        <Trophy size={18} color="#ffd700" />
                    ) : (
                        <Text style={styles.rankText}>#{item.ladder_rank}</Text>
                    )}
                </View>

                <View style={styles.nameContainer}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={[styles.nameText, isCurrentUser && styles.currentUserText]}>
                            {item.full_name}
                        </Text>
                        {isCurrentUser && (
                            <View style={styles.youBadge}>
                                <Text style={styles.youBadgeText}>YOU</Text>
                            </View>
                        )}
                        {isPlaying && (
                            <View style={styles.liveBadge}>
                                <View style={styles.liveDot} />
                                <Text style={styles.liveText}>LIVE</Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.fargoText}>
                        Fargo: {item.fargo_rating} | {item.wins}W - {item.losses}L
                    </Text>
                </View>

                <View style={styles.winRateContainer}>
                    <Text style={[styles.winRateText, { color: getWinRateColor(item.winRate) }]}>
                        {item.winRate}%
                    </Text>
                </View>

                <TouchableOpacity
                    style={[
                        styles.challengeButton,
                        !challengeEnabled && styles.disabledButton
                    ]}
                    onPress={() => challengeEnabled && navigation.navigate('Challenge', { target: item })}
                    disabled={!challengeEnabled}
                    accessibilityLabel={`Challenge ${item.full_name}`}
                >
                    {isPlaying ? (
                        <Trophy size={18} color="#666" />
                    ) : (
                        <Swords size={18} color={challengeEnabled ? "#000" : "#666"} />
                    )}
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <FlatList
                data={loading ? [] : players}
                renderItem={renderItem}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={loading ? renderSkeletons : fetchError ? (
                    <View style={styles.errorContainer}>
                        <AlertCircle size={48} color="#ff9800" />
                        <Text style={styles.errorText}>{fetchError}</Text>
                        {isGuest && (
                            <Text style={styles.errorSubtext}>Sign in to access the full leaderboard</Text>
                        )}
                    </View>
                ) : null}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => fetchLeaderboard(true)}
                        tintColor="#87a96b"
                    />
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a0a',
    },
    mainHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        paddingTop: 60,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginLeft: 15,
    },
    statsBar: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 15,
        marginHorizontal: 15,
        marginTop: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 12,
    },
    statItem: {
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    statValue: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    statValueHighlight: {
        color: '#87a96b',
        fontSize: 20,
        fontWeight: 'bold',
    },
    statLabel: {
        color: '#666',
        fontSize: 11,
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        height: 30,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    tabContainer: {
        flexDirection: 'row',
        padding: 10,
        marginHorizontal: 10,
        marginTop: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        borderRadius: 10,
    },
    tab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 8,
    },
    activeTab: {
        backgroundColor: '#87a96b',
    },
    tabText: {
        color: '#666',
        fontWeight: '600',
    },
    activeTabText: {
        color: '#000',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 12,
        marginTop: 10,
        marginHorizontal: 15,
    },
    headerCol: {
        color: '#666',
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    listContent: {
        paddingBottom: 100,
    },
    rankingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 12,
        marginHorizontal: 15,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    currentUserItem: {
        backgroundColor: 'rgba(135, 169, 107, 0.15)',
        borderColor: 'rgba(135, 169, 107, 0.4)',
    },
    playingItem: {
        borderColor: 'rgba(244, 67, 54, 0.5)',
        borderWidth: 2,
    },
    rankContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(135, 169, 107, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    topThreeRank: {
        backgroundColor: 'rgba(255, 215, 0, 0.2)',
    },
    rankText: {
        color: '#87a96b',
        fontWeight: 'bold',
        fontSize: 14,
    },
    nameContainer: {
        flex: 1,
    },
    nameText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    },
    currentUserText: {
        color: '#87a96b',
    },
    fargoText: {
        color: '#888',
        fontSize: 11,
        marginTop: 2,
    },
    winRateContainer: {
        width: 50,
        alignItems: 'center',
        marginRight: 10,
    },
    winRateText: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    challengeButton: {
        backgroundColor: '#87a96b',
        width: 40,
        height: 40,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    disabledButton: {
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    youBadge: {
        backgroundColor: 'rgba(135, 169, 107, 0.3)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginLeft: 8,
    },
    youBadgeText: {
        color: '#87a96b',
        fontSize: 9,
        fontWeight: 'bold',
    },
    liveBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(244, 67, 54, 0.2)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        marginLeft: 8,
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#f44336',
        marginRight: 4,
    },
    liveText: {
        color: '#f44336',
        fontSize: 9,
        fontWeight: 'bold',
    },
    // Error state styles
    errorContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        paddingHorizontal: 30,
    },
    errorText: {
        color: '#888',
        fontSize: 16,
        textAlign: 'center',
        marginTop: 20,
        lineHeight: 24,
    },
    errorSubtext: {
        color: '#555',
        fontSize: 13,
        textAlign: 'center',
        marginTop: 10,
    },
});
