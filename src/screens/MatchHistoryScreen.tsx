import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    RefreshControl,
    Image
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useGuestStore } from '../store/useGuestStore';
import { Profile, GameType } from '../types';
import { formatRelativeTime, getInitials } from '../lib/utils';
import {
    History,
    Trophy,
    Target,
    TrendingUp,
    Filter,
    Calendar,
    ChevronDown,
    Swords,
    Clock,
    Award,
    X,
    ArrowLeft
} from 'lucide-react-native';
import { SkeletonRankingItem } from '../components/SkeletonLoader';

interface MatchHistoryItem {
    id: string;
    game_type: GameType;
    games_to_win: number;
    challenger_score: number;
    challenged_score: number;
    winner_id: string;
    created_at: string;
    updated_at: string;
    isWin: boolean;
    opponent: {
        id: string;
        full_name: string;
        avatar_url?: string;
        fargo_rating: number;
        ladder_rank: number;
    };
    userScore: number;
    opponentScore: number;
}

interface MatchStats {
    totalMatches: number;
    wins: number;
    losses: number;
    winRate: number;
    currentStreak: number;
    streakType: 'win' | 'loss' | 'none';
    bestStreak: number;
}

type TimeFilter = 'all' | '7days' | '30days' | '90days';
type GameFilter = 'all' | '8-ball' | '9-ball' | '10-ball';
type ResultFilter = 'all' | 'wins' | 'losses';

export default function MatchHistoryScreen({ navigation }: any) {
    const [matches, setMatches] = useState<MatchHistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null);
    const [stats, setStats] = useState<MatchStats>({
        totalMatches: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        currentStreak: 0,
        streakType: 'none',
        bestStreak: 0
    });

    // Filter states
    const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
    const [gameFilter, setGameFilter] = useState<GameFilter>('all');
    const [resultFilter, setResultFilter] = useState<ResultFilter>('all');
    const [showFilters, setShowFilters] = useState(false);

    const isGuest = useGuestStore((state) => state.isGuest);

    async function fetchMatchHistory(isRefresh = false) {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            // Get current user's profile
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                setLoading(false);
                setRefreshing(false);
                return;
            }

            const { data: profileData } = await supabase
                .from('profiles')
                .select('*')
                .eq('owner_id', user.id)
                .single();

            if (!profileData) {
                setLoading(false);
                setRefreshing(false);
                return;
            }

            setCurrentUserProfile(profileData);
            const userId = profileData.id;

            // Build query based on filters
            let query = supabase
                .from('challenges')
                .select(`
                    id,
                    game_type,
                    games_to_win,
                    challenger_id,
                    challenged_id,
                    challenger_score,
                    challenged_score,
                    winner_id,
                    created_at,
                    updated_at,
                    challenger:challenger_id(id, full_name, avatar_url, fargo_rating, ladder_rank),
                    challenged:challenged_id(id, full_name, avatar_url, fargo_rating, ladder_rank)
                `)
                .or(`challenger_id.eq.${userId},challenged_id.eq.${userId}`)
                .eq('status', 'completed')
                .order('created_at', { ascending: false });

            // Apply time filter
            if (timeFilter !== 'all') {
                const daysMap: Record<TimeFilter, number> = {
                    '7days': 7,
                    '30days': 30,
                    '90days': 90,
                    'all': 0
                };
                const days = daysMap[timeFilter];
                if (days > 0) {
                    const dateThreshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
                    query = query.gte('created_at', dateThreshold);
                }
            }

            // Apply game filter
            if (gameFilter !== 'all') {
                query = query.eq('game_type', gameFilter);
            }

            const { data: matchData, error } = await query.limit(100);

            if (error) throw error;

            // Process matches
            let processedMatches: MatchHistoryItem[] = (matchData || []).map((match: any) => {
                const isChallenger = match.challenger_id === userId;
                const opponent = isChallenger ? match.challenged : match.challenger;
                const isWin = match.winner_id === userId;
                const userScore = isChallenger ? match.challenger_score : match.challenged_score;
                const opponentScore = isChallenger ? match.challenged_score : match.challenger_score;

                return {
                    id: match.id,
                    game_type: match.game_type,
                    games_to_win: match.games_to_win,
                    challenger_score: match.challenger_score,
                    challenged_score: match.challenged_score,
                    winner_id: match.winner_id,
                    created_at: match.created_at,
                    updated_at: match.updated_at,
                    isWin,
                    opponent: {
                        id: opponent?.id || '',
                        full_name: opponent?.full_name || 'Unknown',
                        avatar_url: opponent?.avatar_url,
                        fargo_rating: opponent?.fargo_rating || 0,
                        ladder_rank: opponent?.ladder_rank || 0
                    },
                    userScore: userScore || 0,
                    opponentScore: opponentScore || 0
                };
            });

            // Apply result filter
            if (resultFilter === 'wins') {
                processedMatches = processedMatches.filter(m => m.isWin);
            } else if (resultFilter === 'losses') {
                processedMatches = processedMatches.filter(m => !m.isWin);
            }

            setMatches(processedMatches);

            // Calculate stats (from all matches, not filtered)
            const allMatchesForStats = (matchData || []).map((match: any) => ({
                isWin: match.winner_id === userId,
                created_at: match.created_at
            })).sort((a: any, b: any) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );

            const wins = allMatchesForStats.filter((m: any) => m.isWin).length;
            const losses = allMatchesForStats.length - wins;
            const winRate = allMatchesForStats.length > 0
                ? Math.round((wins / allMatchesForStats.length) * 100)
                : 0;

            // Calculate current streak
            let currentStreak = 0;
            let streakType: 'win' | 'loss' | 'none' = 'none';
            for (const match of allMatchesForStats) {
                if (currentStreak === 0) {
                    streakType = match.isWin ? 'win' : 'loss';
                    currentStreak = 1;
                } else if ((match.isWin && streakType === 'win') || (!match.isWin && streakType === 'loss')) {
                    currentStreak++;
                } else {
                    break;
                }
            }

            // Calculate best win streak
            let bestStreak = 0;
            let tempStreak = 0;
            for (const match of allMatchesForStats) {
                if (match.isWin) {
                    tempStreak++;
                    bestStreak = Math.max(bestStreak, tempStreak);
                } else {
                    tempStreak = 0;
                }
            }

            setStats({
                totalMatches: allMatchesForStats.length,
                wins,
                losses,
                winRate,
                currentStreak,
                streakType,
                bestStreak
            });

        } catch (error: any) {
            console.error('Error fetching match history:', error.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }

    useEffect(() => {
        fetchMatchHistory();

        // Real-time subscription for changes
        const channel = supabase
            .channel('match-history-changes')
            .on(
                'postgres_changes' as any,
                { event: '*', table: 'challenges' },
                () => fetchMatchHistory()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // Refetch when filters change
    useEffect(() => {
        if (!loading) {
            fetchMatchHistory();
        }
    }, [timeFilter, gameFilter, resultFilter]);

    const getWinRateColor = (rate: number) => {
        if (rate >= 70) return '#4caf50';
        if (rate >= 50) return '#ff9800';
        return '#f44336';
    };

    const renderHeader = () => (
        <View>
            <View style={styles.mainHeader}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <ArrowLeft color="#fff" size={24} />
                </TouchableOpacity>
                <History color="#87a96b" size={28} />
                <Text style={styles.title}>MATCH HISTORY</Text>
            </View>

            {/* Stats Summary */}
            {currentUserProfile && (
                <View style={styles.statsCard}>
                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{stats.totalMatches}</Text>
                            <Text style={styles.statLabel}>Matches</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Trophy size={16} color="#ffd700" style={{ marginBottom: 4 }} />
                            <Text style={[styles.statValue, { color: '#ffd700' }]}>{stats.wins}</Text>
                            <Text style={styles.statLabel}>Wins</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Target size={16} color="#f44336" style={{ marginBottom: 4 }} />
                            <Text style={[styles.statValue, { color: '#f44336' }]}>{stats.losses}</Text>
                            <Text style={styles.statLabel}>Losses</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <TrendingUp size={16} color={getWinRateColor(stats.winRate)} style={{ marginBottom: 4 }} />
                            <Text style={[styles.statValue, { color: getWinRateColor(stats.winRate) }]}>
                                {stats.winRate}%
                            </Text>
                            <Text style={styles.statLabel}>Win Rate</Text>
                        </View>
                    </View>

                    {stats.currentStreak > 1 && (
                        <View style={[
                            styles.streakBadge,
                            stats.streakType === 'win' ? styles.winStreak : styles.lossStreak
                        ]}>
                            <Award size={14} color={stats.streakType === 'win' ? '#ffd700' : '#f44336'} />
                            <Text style={[
                                styles.streakText,
                                { color: stats.streakType === 'win' ? '#ffd700' : '#f44336' }
                            ]}>
                                {stats.currentStreak} {stats.streakType === 'win' ? 'Win' : 'Loss'} Streak
                            </Text>
                        </View>
                    )}
                </View>
            )}

            {/* Filter Toggle Button */}
            <TouchableOpacity
                style={styles.filterToggle}
                onPress={() => setShowFilters(!showFilters)}
            >
                <Filter size={18} color="#87a96b" />
                <Text style={styles.filterToggleText}>
                    {showFilters ? 'Hide Filters' : 'Show Filters'}
                </Text>
                <ChevronDown
                    size={18}
                    color="#87a96b"
                    style={{ transform: [{ rotate: showFilters ? '180deg' : '0deg' }] }}
                />
            </TouchableOpacity>

            {/* Filter Options */}
            {showFilters && (
                <View style={styles.filterContainer}>
                    {/* Time Filter */}
                    <View style={styles.filterSection}>
                        <View style={styles.filterHeader}>
                            <Calendar size={14} color="#666" />
                            <Text style={styles.filterLabel}>TIME PERIOD</Text>
                        </View>
                        <View style={styles.filterOptions}>
                            {(['all', '7days', '30days', '90days'] as TimeFilter[]).map((filter) => (
                                <TouchableOpacity
                                    key={filter}
                                    style={[
                                        styles.filterChip,
                                        timeFilter === filter && styles.filterChipActive
                                    ]}
                                    onPress={() => setTimeFilter(filter)}
                                >
                                    <Text style={[
                                        styles.filterChipText,
                                        timeFilter === filter && styles.filterChipTextActive
                                    ]}>
                                        {filter === 'all' ? 'All Time' :
                                         filter === '7days' ? '7 Days' :
                                         filter === '30days' ? '30 Days' : '90 Days'}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Game Type Filter */}
                    <View style={styles.filterSection}>
                        <View style={styles.filterHeader}>
                            <Swords size={14} color="#666" />
                            <Text style={styles.filterLabel}>GAME TYPE</Text>
                        </View>
                        <View style={styles.filterOptions}>
                            {(['all', '8-ball', '9-ball', '10-ball'] as GameFilter[]).map((filter) => (
                                <TouchableOpacity
                                    key={filter}
                                    style={[
                                        styles.filterChip,
                                        gameFilter === filter && styles.filterChipActive
                                    ]}
                                    onPress={() => setGameFilter(filter)}
                                >
                                    <Text style={[
                                        styles.filterChipText,
                                        gameFilter === filter && styles.filterChipTextActive
                                    ]}>
                                        {filter === 'all' ? 'All Games' : filter.toUpperCase()}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Result Filter */}
                    <View style={styles.filterSection}>
                        <View style={styles.filterHeader}>
                            <Trophy size={14} color="#666" />
                            <Text style={styles.filterLabel}>RESULT</Text>
                        </View>
                        <View style={styles.filterOptions}>
                            {(['all', 'wins', 'losses'] as ResultFilter[]).map((filter) => (
                                <TouchableOpacity
                                    key={filter}
                                    style={[
                                        styles.filterChip,
                                        resultFilter === filter && styles.filterChipActive
                                    ]}
                                    onPress={() => setResultFilter(filter)}
                                >
                                    <Text style={[
                                        styles.filterChipText,
                                        resultFilter === filter && styles.filterChipTextActive
                                    ]}>
                                        {filter === 'all' ? 'All Results' :
                                         filter === 'wins' ? 'Wins Only' : 'Losses Only'}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Clear Filters */}
                    {(timeFilter !== 'all' || gameFilter !== 'all' || resultFilter !== 'all') && (
                        <TouchableOpacity
                            style={styles.clearFilters}
                            onPress={() => {
                                setTimeFilter('all');
                                setGameFilter('all');
                                setResultFilter('all');
                            }}
                        >
                            <X size={14} color="#f44336" />
                            <Text style={styles.clearFiltersText}>Clear All Filters</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {/* Active Filters Indicator */}
            {!showFilters && (timeFilter !== 'all' || gameFilter !== 'all' || resultFilter !== 'all') && (
                <View style={styles.activeFiltersBar}>
                    <Text style={styles.activeFiltersText}>
                        Filters: {timeFilter !== 'all' ? timeFilter.replace('days', ' days') : ''}
                        {gameFilter !== 'all' ? ` • ${gameFilter}` : ''}
                        {resultFilter !== 'all' ? ` • ${resultFilter}` : ''}
                    </Text>
                    <TouchableOpacity onPress={() => {
                        setTimeFilter('all');
                        setGameFilter('all');
                        setResultFilter('all');
                    }}>
                        <X size={16} color="#666" />
                    </TouchableOpacity>
                </View>
            )}

            {/* Results Count */}
            <View style={styles.resultsHeader}>
                <Text style={styles.resultsCount}>
                    {matches.length} {matches.length === 1 ? 'match' : 'matches'}
                </Text>
            </View>
        </View>
    );

    const renderSkeleton = () => (
        <View>
            {[1, 2, 3, 4, 5, 6].map((i) => (
                <SkeletonRankingItem key={i} />
            ))}
        </View>
    );

    const renderEmpty = () => (
        <View style={styles.emptyState}>
            <History size={64} color="#333" />
            <Text style={styles.emptyTitle}>No Matches Found</Text>
            <Text style={styles.emptySubtitle}>
                {isGuest
                    ? 'Sign in to view your match history'
                    : 'Start playing to build your match history!'}
            </Text>
            {!isGuest && (
                <TouchableOpacity
                    style={styles.playButton}
                    onPress={() => navigation.navigate('Rankings')}
                >
                    <Swords size={18} color="#000" />
                    <Text style={styles.playButtonText}>Find Opponents</Text>
                </TouchableOpacity>
            )}
        </View>
    );

    const renderItem = ({ item }: { item: MatchHistoryItem }) => {
        return (
            <View style={[
                styles.matchCard,
                item.isWin ? styles.matchCardWin : styles.matchCardLoss
            ]}>
                <View style={styles.matchHeader}>
                    <View style={[
                        styles.resultBadge,
                        item.isWin ? styles.winBadge : styles.lossBadge
                    ]}>
                        {item.isWin ? (
                            <Trophy size={12} color="#ffd700" />
                        ) : (
                            <Target size={12} color="#f44336" />
                        )}
                        <Text style={[
                            styles.resultText,
                            item.isWin ? styles.winText : styles.lossText
                        ]}>
                            {item.isWin ? 'VICTORY' : 'DEFEAT'}
                        </Text>
                    </View>
                    <Text style={styles.matchTime}>{formatRelativeTime(item.created_at)}</Text>
                </View>

                <View style={styles.matchContent}>
                    <View style={styles.opponentInfo}>
                        {item.opponent.avatar_url ? (
                            <Image
                                source={{ uri: item.opponent.avatar_url }}
                                style={styles.opponentAvatar}
                            />
                        ) : (
                            <View style={[styles.opponentAvatar, styles.opponentAvatarPlaceholder]}>
                                <Text style={styles.opponentInitials}>
                                    {getInitials(item.opponent.full_name)}
                                </Text>
                            </View>
                        )}
                        <View style={styles.opponentDetails}>
                            <Text style={styles.opponentName}>{item.opponent.full_name}</Text>
                            <Text style={styles.opponentMeta}>
                                #{item.opponent.ladder_rank} • Fargo: {item.opponent.fargo_rating}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.scoreSection}>
                        <View style={styles.scoreContainer}>
                            <Text style={[
                                styles.score,
                                item.isWin ? styles.winScore : styles.lossScore
                            ]}>
                                {item.userScore}
                            </Text>
                            <Text style={styles.scoreSeparator}>-</Text>
                            <Text style={[
                                styles.score,
                                !item.isWin ? styles.winScore : styles.lossScore
                            ]}>
                                {item.opponentScore}
                            </Text>
                        </View>
                        <Text style={styles.gameType}>{item.game_type.toUpperCase()}</Text>
                    </View>
                </View>

                <View style={styles.matchFooter}>
                    <View style={styles.matchMeta}>
                        <Clock size={12} color="#555" />
                        <Text style={styles.matchMetaText}>
                            Race to {item.games_to_win}
                        </Text>
                    </View>
                </View>
            </View>
        );
    };

    // Guest mode view
    if (isGuest) {
        return (
            <View style={styles.container}>
                <View style={styles.mainHeader}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <ArrowLeft color="#fff" size={24} />
                    </TouchableOpacity>
                    <History color="#87a96b" size={28} />
                    <Text style={styles.title}>MATCH HISTORY</Text>
                </View>
                <View style={styles.guestContainer}>
                    <History size={64} color="#333" />
                    <Text style={styles.guestTitle}>Sign In Required</Text>
                    <Text style={styles.guestSubtitle}>
                        Sign in to view your match history and track your progress
                    </Text>
                    <TouchableOpacity
                        style={styles.signInButton}
                        onPress={() => navigation.navigate('Auth')}
                    >
                        <Text style={styles.signInButtonText}>Sign In</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={loading ? [] : matches}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={loading ? renderSkeleton : renderEmpty}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => fetchMatchHistory(true)}
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
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
    },
    backButton: {
        marginRight: 15,
        padding: 4,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#fff',
        marginLeft: 12,
    },
    // Stats Card
    statsCard: {
        margin: 15,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        color: '#fff',
        fontSize: 22,
        fontWeight: 'bold',
    },
    statLabel: {
        color: '#666',
        fontSize: 10,
        marginTop: 4,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    statDivider: {
        width: 1,
        height: 40,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    streakBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginTop: 15,
    },
    winStreak: {
        backgroundColor: 'rgba(255, 215, 0, 0.15)',
    },
    lossStreak: {
        backgroundColor: 'rgba(244, 67, 54, 0.15)',
    },
    streakText: {
        fontSize: 13,
        fontWeight: 'bold',
        marginLeft: 6,
    },
    // Filter Toggle
    filterToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 15,
        padding: 12,
        backgroundColor: 'rgba(135, 169, 107, 0.1)',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(135, 169, 107, 0.2)',
    },
    filterToggleText: {
        color: '#87a96b',
        fontSize: 14,
        fontWeight: '600',
        marginHorizontal: 8,
    },
    // Filter Container
    filterContainer: {
        margin: 15,
        marginTop: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 12,
        padding: 15,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    filterSection: {
        marginBottom: 15,
    },
    filterHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    filterLabel: {
        color: '#666',
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 1,
        marginLeft: 6,
    },
    filterOptions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    filterChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    filterChipActive: {
        backgroundColor: '#87a96b',
        borderColor: '#87a96b',
    },
    filterChipText: {
        color: '#888',
        fontSize: 12,
        fontWeight: '500',
    },
    filterChipTextActive: {
        color: '#000',
    },
    clearFilters: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        marginTop: 5,
    },
    clearFiltersText: {
        color: '#f44336',
        fontSize: 13,
        fontWeight: '500',
        marginLeft: 6,
    },
    // Active Filters Bar
    activeFiltersBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginHorizontal: 15,
        marginTop: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: 'rgba(135, 169, 107, 0.1)',
        borderRadius: 8,
    },
    activeFiltersText: {
        color: '#87a96b',
        fontSize: 12,
    },
    // Results Header
    resultsHeader: {
        paddingHorizontal: 15,
        paddingVertical: 12,
        marginTop: 5,
    },
    resultsCount: {
        color: '#666',
        fontSize: 13,
    },
    // List Content
    listContent: {
        paddingBottom: 100,
    },
    // Match Card
    matchCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 16,
        marginHorizontal: 15,
        marginBottom: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    matchCardWin: {
        borderLeftWidth: 4,
        borderLeftColor: '#ffd700',
    },
    matchCardLoss: {
        borderLeftWidth: 4,
        borderLeftColor: '#f44336',
    },
    matchHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 8,
    },
    resultBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 4,
    },
    winBadge: {
        backgroundColor: 'rgba(255, 215, 0, 0.15)',
    },
    lossBadge: {
        backgroundColor: 'rgba(244, 67, 54, 0.15)',
    },
    resultText: {
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 1,
        marginLeft: 4,
    },
    winText: {
        color: '#ffd700',
    },
    lossText: {
        color: '#f44336',
    },
    matchTime: {
        color: '#555',
        fontSize: 11,
    },
    matchContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    opponentInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    opponentAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 2,
        borderColor: '#87a96b',
    },
    opponentAvatarPlaceholder: {
        backgroundColor: '#1a1a1a',
        justifyContent: 'center',
        alignItems: 'center',
    },
    opponentInitials: {
        color: '#87a96b',
        fontSize: 16,
        fontWeight: 'bold',
    },
    opponentDetails: {
        marginLeft: 12,
        flex: 1,
    },
    opponentName: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    },
    opponentMeta: {
        color: '#666',
        fontSize: 12,
        marginTop: 2,
    },
    scoreSection: {
        alignItems: 'center',
    },
    scoreContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    score: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    winScore: {
        color: '#ffd700',
    },
    lossScore: {
        color: '#888',
    },
    scoreSeparator: {
        color: '#444',
        fontSize: 20,
        marginHorizontal: 8,
    },
    gameType: {
        color: '#555',
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 1,
        marginTop: 4,
    },
    matchFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
    },
    matchMeta: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    matchMetaText: {
        color: '#555',
        fontSize: 11,
        marginLeft: 6,
    },
    // Empty State
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 80,
        paddingHorizontal: 30,
    },
    emptyTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 20,
    },
    emptySubtitle: {
        color: '#666',
        fontSize: 14,
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 20,
    },
    playButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#87a96b',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 12,
        marginTop: 24,
    },
    playButtonText: {
        color: '#000',
        fontSize: 15,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    // Guest Container
    guestContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 30,
    },
    guestTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: 20,
    },
    guestSubtitle: {
        color: '#666',
        fontSize: 14,
        textAlign: 'center',
        marginTop: 10,
        lineHeight: 20,
    },
    signInButton: {
        backgroundColor: '#87a96b',
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 12,
        marginTop: 24,
    },
    signInButtonText: {
        color: '#000',
        fontSize: 15,
        fontWeight: 'bold',
    },
});
