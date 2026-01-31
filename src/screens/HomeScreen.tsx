import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    Image
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useGuestStore } from '../store/useGuestStore';
import { Profile } from '../types';
import { formatRelativeTime, getInitials } from '../lib/utils';
import {
    Home,
    Trophy,
    Target,
    Award,
    TrendingUp,
    Swords,
    Users,
    Zap,
    ChevronRight,
    Clock,
    Eye,
    UserPlus
} from 'lucide-react-native';
import { SkeletonLoader } from '../components/SkeletonLoader';

interface LeagueStats {
    totalPlayers: number;
    activeMatches: number;
    completedMatches: number;
    weeklyMatches: number;
}

interface RecentMatch {
    id: string;
    winner_name: string;
    loser_name: string;
    score: string;
    game_type: string;
    created_at: string;
}

interface UserStats {
    wins: number;
    losses: number;
    winRate: number;
    currentStreak: number;
    streakType: 'win' | 'loss' | 'none';
}

export default function HomeScreen({ navigation }: any) {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [userStats, setUserStats] = useState<UserStats>({ wins: 0, losses: 0, winRate: 0, currentStreak: 0, streakType: 'none' });
    const [leagueStats, setLeagueStats] = useState<LeagueStats>({ totalPlayers: 0, activeMatches: 0, completedMatches: 0, weeklyMatches: 0 });
    const [recentMatches, setRecentMatches] = useState<RecentMatch[]>([]);
    const [topPlayers, setTopPlayers] = useState<Profile[]>([]);

    const isGuest = useGuestStore((state) => state.isGuest);

    async function fetchDashboardData(isRefresh = false) {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            // Get current user's profile if logged in
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                const { data: profileData } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('owner_id', user.id)
                    .single();

                if (profileData) {
                    setProfile(profileData);

                    // Fetch user's challenge stats
                    const { data: userChallenges } = await supabase
                        .from('challenges')
                        .select('winner_id, created_at')
                        .or(`challenger_id.eq.${profileData.id},challenged_id.eq.${profileData.id}`)
                        .eq('status', 'completed')
                        .order('created_at', { ascending: false });

                    if (userChallenges) {
                        const wins = userChallenges.filter(c => c.winner_id === profileData.id).length;
                        const losses = userChallenges.length - wins;
                        const winRate = userChallenges.length > 0 ? Math.round((wins / userChallenges.length) * 100) : 0;

                        // Calculate current streak
                        let streak = 0;
                        let streakType: 'win' | 'loss' | 'none' = 'none';
                        for (const match of userChallenges) {
                            const isWin = match.winner_id === profileData.id;
                            if (streak === 0) {
                                streakType = isWin ? 'win' : 'loss';
                                streak = 1;
                            } else if ((isWin && streakType === 'win') || (!isWin && streakType === 'loss')) {
                                streak++;
                            } else {
                                break;
                            }
                        }

                        setUserStats({ wins, losses, winRate, currentStreak: streak, streakType });
                    }
                }
            }

            // Fetch league stats
            const [profilesRes, liveMatchesRes, completedMatchesRes, weeklyMatchesRes] = await Promise.all([
                supabase.from('profiles').select('id', { count: 'exact', head: true }),
                supabase.from('challenges').select('id', { count: 'exact', head: true }).eq('status', 'live'),
                supabase.from('challenges').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
                supabase.from('challenges')
                    .select('id', { count: 'exact', head: true })
                    .eq('status', 'completed')
                    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
            ]);

            setLeagueStats({
                totalPlayers: profilesRes.count || 0,
                activeMatches: liveMatchesRes.count || 0,
                completedMatches: completedMatchesRes.count || 0,
                weeklyMatches: weeklyMatchesRes.count || 0
            });

            // Fetch recent matches (last 5 completed)
            const { data: recentMatchData } = await supabase
                .from('challenges')
                .select(`
                    id,
                    game_type,
                    challenger_score,
                    challenged_score,
                    winner_id,
                    created_at,
                    challenger:challenger_id(full_name),
                    challenged:challenged_id(full_name)
                `)
                .eq('status', 'completed')
                .order('created_at', { ascending: false })
                .limit(5);

            if (recentMatchData) {
                const matches: RecentMatch[] = recentMatchData.map((m: any) => {
                    const challengerName = m.challenger?.full_name || 'Unknown';
                    const challengedName = m.challenged?.full_name || 'Unknown';
                    const isWinnerChallenger = m.winner_id === m.challenger_id;

                    return {
                        id: m.id,
                        winner_name: isWinnerChallenger ? challengerName : challengedName,
                        loser_name: isWinnerChallenger ? challengedName : challengerName,
                        score: `${m.challenger_score || 0}-${m.challenged_score || 0}`,
                        game_type: m.game_type,
                        created_at: m.created_at
                    };
                });
                setRecentMatches(matches);
            }

            // Fetch top 3 players
            const { data: topPlayersData } = await supabase
                .from('profiles')
                .select('*')
                .order('ladder_rank', { ascending: true })
                .limit(3);

            if (topPlayersData) {
                setTopPlayers(topPlayersData);
            }

        } catch (error: any) {
            console.error('Error fetching dashboard:', error.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }

    useEffect(() => {
        fetchDashboardData();

        // Real-time subscription for updates
        const channel = supabase
            .channel('home-dashboard')
            .on('postgres_changes' as any, { event: '*', table: 'challenges' }, () => fetchDashboardData())
            .on('postgres_changes' as any, { event: '*', table: 'profiles' }, () => fetchDashboardData())
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // Skeleton loader component for dashboard
    const renderSkeleton = () => (
        <View style={styles.skeletonContainer}>
            <View style={styles.skeletonHeader}>
                <SkeletonLoader width={200} height={32} borderRadius={8} />
                <SkeletonLoader width={100} height={20} borderRadius={4} style={{ marginTop: 8 }} />
            </View>
            <View style={styles.skeletonStatsGrid}>
                {[1, 2, 3, 4].map((i) => (
                    <SkeletonLoader key={i} width="48%" height={100} borderRadius={12} style={{ marginBottom: 12 }} />
                ))}
            </View>
            <SkeletonLoader width="100%" height={150} borderRadius={12} style={{ marginTop: 20 }} />
        </View>
    );

    // Guest mode UI
    if (isGuest) {
        return (
            <ScrollView
                style={styles.container}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchDashboardData(true)} tintColor="#87a96b" />}
            >
                <View style={styles.header}>
                    <Home color="#87a96b" size={32} />
                    <Text style={styles.title}>HOME</Text>
                </View>

                <View style={styles.guestBanner}>
                    <View style={styles.guestIconWrap}>
                        <Eye size={40} color="#666" />
                    </View>
                    <Text style={styles.guestTitle}>Welcome, Guest!</Text>
                    <Text style={styles.guestSubtitle}>Sign up to track your stats and climb the ladder</Text>
                    <TouchableOpacity style={styles.guestSignUpBtn} onPress={() => navigation.navigate('Auth')}>
                        <UserPlus size={18} color="#000" />
                        <Text style={styles.guestSignUpText}>Sign Up / Sign In</Text>
                    </TouchableOpacity>
                </View>

                {/* League Overview for Guests */}
                <View style={styles.sectionHeader}>
                    <Users size={20} color="#87a96b" />
                    <Text style={styles.sectionTitle}>LEAGUE OVERVIEW</Text>
                </View>

                <View style={styles.leagueStatsCard}>
                    <View style={styles.leagueStatItem}>
                        <Text style={styles.leagueStatValue}>{leagueStats.totalPlayers}</Text>
                        <Text style={styles.leagueStatLabel}>Players</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.leagueStatItem}>
                        <Text style={styles.leagueStatValue}>{leagueStats.activeMatches}</Text>
                        <Text style={styles.leagueStatLabel}>Live Now</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.leagueStatItem}>
                        <Text style={styles.leagueStatValue}>{leagueStats.weeklyMatches}</Text>
                        <Text style={styles.leagueStatLabel}>This Week</Text>
                    </View>
                </View>

                {/* Top Players */}
                {renderTopPlayers()}

                {/* Recent Matches */}
                {renderRecentMatches()}
            </ScrollView>
        );
    }

    // Authenticated user view
    if (loading) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <Home color="#87a96b" size={32} />
                    <Text style={styles.title}>HOME</Text>
                </View>
                {renderSkeleton()}
            </View>
        );
    }

    const renderQuickStats = () => (
        <View style={styles.quickStatsSection}>
            <View style={styles.statsGrid}>
                {/* Wins */}
                <View style={[styles.statWidget, styles.statWidgetWins]}>
                    <Trophy size={24} color="#ffd700" />
                    <Text style={styles.statWidgetValue}>{userStats.wins}</Text>
                    <Text style={styles.statWidgetLabel}>Wins</Text>
                </View>

                {/* Losses */}
                <View style={[styles.statWidget, styles.statWidgetLosses]}>
                    <Target size={24} color="#f44336" />
                    <Text style={styles.statWidgetValue}>{userStats.losses}</Text>
                    <Text style={styles.statWidgetLabel}>Losses</Text>
                </View>

                {/* Win Rate */}
                <View style={[styles.statWidget, styles.statWidgetWinRate]}>
                    <TrendingUp size={24} color={userStats.winRate >= 50 ? '#4caf50' : '#ff9800'} />
                    <Text style={[styles.statWidgetValue, { color: userStats.winRate >= 50 ? '#4caf50' : '#ff9800' }]}>
                        {userStats.winRate}%
                    </Text>
                    <Text style={styles.statWidgetLabel}>Win Rate</Text>
                </View>

                {/* Fargo Rating */}
                <View style={[styles.statWidget, styles.statWidgetFargo]}>
                    <Award size={24} color="#87a96b" />
                    <Text style={styles.statWidgetValue}>{profile?.fargo_rating || 0}</Text>
                    <Text style={styles.statWidgetLabel}>Fargo</Text>
                </View>
            </View>

            {/* Streak indicator */}
            {userStats.currentStreak > 1 && (
                <View style={[styles.streakBadge, userStats.streakType === 'win' ? styles.winStreak : styles.lossStreak]}>
                    <Zap size={14} color={userStats.streakType === 'win' ? '#ffd700' : '#f44336'} />
                    <Text style={[styles.streakText, { color: userStats.streakType === 'win' ? '#ffd700' : '#f44336' }]}>
                        {userStats.currentStreak} {userStats.streakType === 'win' ? 'Win' : 'Loss'} Streak!
                    </Text>
                </View>
            )}
        </View>
    );

    const renderRankCard = () => (
        <View style={styles.rankCard}>
            <View style={styles.rankCardContent}>
                <View style={styles.rankCircle}>
                    <Text style={styles.rankNumber}>#{profile?.ladder_rank || '?'}</Text>
                </View>
                <View style={styles.rankInfo}>
                    <Text style={styles.rankTitle}>Your Ladder Position</Text>
                    <Text style={styles.rankSubtitle}>
                        {profile?.ladder_rank === 1 ? 'You are the Champion!' :
                         profile?.ladder_rank && profile.ladder_rank <= 3 ? 'Top 3 - Elite status!' :
                         profile?.ladder_rank && profile.ladder_rank <= 10 ? 'Top 10 - Keep climbing!' :
                         'Challenge higher ranks to climb!'}
                    </Text>
                </View>
            </View>
            <TouchableOpacity
                style={styles.viewLadderBtn}
                onPress={() => navigation.navigate('Rankings')}
            >
                <Text style={styles.viewLadderText}>View Ladder</Text>
                <ChevronRight size={16} color="#87a96b" />
            </TouchableOpacity>
        </View>
    );

    const renderEngagementCard = () => (
        <View style={styles.engagementCard}>
            <Text style={styles.engagementValue}>{profile?.points || 0}</Text>
            <Text style={styles.engagementLabel}>ENGAGEMENT POINTS</Text>
            <View style={styles.engagementBreakdown}>
                <View style={styles.engagementItem}>
                    <Swords size={14} color="#87a96b" />
                    <Text style={styles.engagementItemText}>+2 Challenge</Text>
                </View>
                <View style={styles.engagementItem}>
                    <Clock size={14} color="#87a96b" />
                    <Text style={styles.engagementItemText}>+1 Play</Text>
                </View>
                <View style={styles.engagementItem}>
                    <Trophy size={14} color="#87a96b" />
                    <Text style={styles.engagementItemText}>+3 Win</Text>
                </View>
            </View>
        </View>
    );

    const renderTopPlayers = () => (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <Trophy size={20} color="#ffd700" />
                <Text style={styles.sectionTitle}>TOP PLAYERS</Text>
            </View>
            <View style={styles.topPlayersContainer}>
                {topPlayers.map((player, index) => (
                    <View key={player.id} style={styles.topPlayerCard}>
                        <View style={[styles.topPlayerRank, index === 0 && styles.topPlayerRankGold]}>
                            <Text style={styles.topPlayerRankText}>#{index + 1}</Text>
                        </View>
                        {player.avatar_url ? (
                            <Image source={{ uri: player.avatar_url }} style={styles.topPlayerAvatar} />
                        ) : (
                            <View style={[styles.topPlayerAvatar, styles.topPlayerAvatarPlaceholder]}>
                                <Text style={styles.topPlayerInitials}>{getInitials(player.full_name)}</Text>
                            </View>
                        )}
                        <Text style={styles.topPlayerName} numberOfLines={1}>{player.full_name}</Text>
                        <Text style={styles.topPlayerFargo}>Fargo: {player.fargo_rating}</Text>
                    </View>
                ))}
            </View>
        </View>
    );

    const renderRecentMatches = () => (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <Swords size={20} color="#87a96b" />
                <Text style={styles.sectionTitle}>RECENT MATCHES</Text>
            </View>
            {recentMatches.length === 0 ? (
                <View style={styles.emptyMatches}>
                    <Text style={styles.emptyMatchesText}>No recent matches</Text>
                </View>
            ) : (
                recentMatches.map((match) => (
                    <View key={match.id} style={styles.matchCard}>
                        <View style={styles.matchContent}>
                            <View style={styles.matchResult}>
                                <Trophy size={14} color="#ffd700" />
                                <Text style={styles.matchWinner}>{match.winner_name}</Text>
                            </View>
                            <Text style={styles.matchScore}>{match.score}</Text>
                            <Text style={styles.matchLoser}>{match.loser_name}</Text>
                        </View>
                        <View style={styles.matchMeta}>
                            <Text style={styles.matchGameType}>{match.game_type?.toUpperCase()}</Text>
                            <Text style={styles.matchTime}>{formatRelativeTime(match.created_at)}</Text>
                        </View>
                    </View>
                ))
            )}
        </View>
    );

    const renderLeagueOverview = () => (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
                <Users size={20} color="#87a96b" />
                <Text style={styles.sectionTitle}>LEAGUE OVERVIEW</Text>
            </View>
            <View style={styles.leagueStatsCard}>
                <View style={styles.leagueStatItem}>
                    <Text style={styles.leagueStatValue}>{leagueStats.totalPlayers}</Text>
                    <Text style={styles.leagueStatLabel}>Players</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.leagueStatItem}>
                    <Text style={[styles.leagueStatValue, leagueStats.activeMatches > 0 && styles.liveValue]}>
                        {leagueStats.activeMatches}
                    </Text>
                    <Text style={styles.leagueStatLabel}>Live Now</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.leagueStatItem}>
                    <Text style={styles.leagueStatValue}>{leagueStats.weeklyMatches}</Text>
                    <Text style={styles.leagueStatLabel}>This Week</Text>
                </View>
            </View>
        </View>
    );

    return (
        <ScrollView
            style={styles.container}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchDashboardData(true)} tintColor="#87a96b" />}
        >
            <View style={styles.header}>
                <Home color="#87a96b" size={32} />
                <Text style={styles.title}>HOME</Text>
            </View>

            {/* Welcome Message */}
            {profile && (
                <View style={styles.welcomeSection}>
                    {profile.avatar_url ? (
                        <Image source={{ uri: profile.avatar_url }} style={styles.welcomeAvatar} />
                    ) : (
                        <View style={[styles.welcomeAvatar, styles.welcomeAvatarPlaceholder]}>
                            <Text style={styles.welcomeInitials}>{getInitials(profile.full_name)}</Text>
                        </View>
                    )}
                    <View style={styles.welcomeText}>
                        <Text style={styles.welcomeName}>Welcome back,</Text>
                        <Text style={styles.welcomeFullName}>{profile.full_name}</Text>
                    </View>
                </View>
            )}

            {/* Quick Stats Widgets */}
            {renderQuickStats()}

            {/* Rank Card */}
            {renderRankCard()}

            {/* Engagement Points */}
            {renderEngagementCard()}

            {/* League Overview */}
            {renderLeagueOverview()}

            {/* Top Players */}
            {renderTopPlayers()}

            {/* Recent Matches */}
            {renderRecentMatches()}

            <View style={styles.bottomPadding} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a0a',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        paddingTop: 60,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginLeft: 15,
    },
    // Welcome Section
    welcomeSection: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        paddingTop: 10,
    },
    welcomeAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        borderWidth: 2,
        borderColor: '#87a96b',
    },
    welcomeAvatarPlaceholder: {
        backgroundColor: '#1a1a1a',
        justifyContent: 'center',
        alignItems: 'center',
    },
    welcomeInitials: {
        color: '#87a96b',
        fontSize: 18,
        fontWeight: 'bold',
    },
    welcomeText: {
        marginLeft: 15,
    },
    welcomeName: {
        color: '#666',
        fontSize: 14,
    },
    welcomeFullName: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    // Quick Stats Section
    quickStatsSection: {
        paddingHorizontal: 15,
        marginTop: 10,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    statWidget: {
        width: '48%',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    statWidgetWins: {
        borderColor: 'rgba(255, 215, 0, 0.2)',
    },
    statWidgetLosses: {
        borderColor: 'rgba(244, 67, 54, 0.2)',
    },
    statWidgetWinRate: {
        borderColor: 'rgba(135, 169, 107, 0.2)',
    },
    statWidgetFargo: {
        borderColor: 'rgba(135, 169, 107, 0.2)',
    },
    statWidgetValue: {
        color: '#fff',
        fontSize: 32,
        fontWeight: 'bold',
        marginTop: 8,
    },
    statWidgetLabel: {
        color: '#666',
        fontSize: 12,
        marginTop: 4,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    // Streak Badge
    streakBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginTop: 5,
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
    // Rank Card
    rankCard: {
        marginHorizontal: 15,
        marginTop: 20,
        backgroundColor: 'rgba(135, 169, 107, 0.1)',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(135, 169, 107, 0.2)',
    },
    rankCardContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    rankCircle: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: 'rgba(135, 169, 107, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#87a96b',
    },
    rankNumber: {
        color: '#87a96b',
        fontSize: 24,
        fontWeight: 'bold',
    },
    rankInfo: {
        flex: 1,
        marginLeft: 16,
    },
    rankTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    rankSubtitle: {
        color: '#888',
        fontSize: 13,
        marginTop: 4,
    },
    viewLadderBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(135, 169, 107, 0.2)',
    },
    viewLadderText: {
        color: '#87a96b',
        fontSize: 14,
        fontWeight: '600',
    },
    // Engagement Card
    engagementCard: {
        marginHorizontal: 15,
        marginTop: 15,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    engagementValue: {
        color: '#fff',
        fontSize: 42,
        fontWeight: 'bold',
    },
    engagementLabel: {
        color: '#87a96b',
        fontSize: 11,
        fontWeight: 'bold',
        marginTop: 4,
        letterSpacing: 1,
    },
    engagementBreakdown: {
        flexDirection: 'row',
        marginTop: 16,
        gap: 20,
    },
    engagementItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    engagementItemText: {
        color: '#666',
        fontSize: 11,
    },
    // Section styles
    section: {
        marginTop: 25,
        paddingHorizontal: 15,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    sectionTitle: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
        marginLeft: 10,
        letterSpacing: 1,
    },
    // League Stats
    leagueStatsCard: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 12,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    leagueStatItem: {
        flex: 1,
        alignItems: 'center',
    },
    leagueStatValue: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
    },
    liveValue: {
        color: '#f44336',
    },
    leagueStatLabel: {
        color: '#666',
        fontSize: 11,
        marginTop: 4,
    },
    statDivider: {
        width: 1,
        height: 40,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    // Top Players
    topPlayersContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    topPlayerCard: {
        flex: 1,
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 12,
        padding: 15,
        marginHorizontal: 4,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    topPlayerRank: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: '#333',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
    },
    topPlayerRankGold: {
        backgroundColor: 'rgba(255, 215, 0, 0.3)',
    },
    topPlayerRankText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    topPlayerAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        borderWidth: 2,
        borderColor: '#87a96b',
    },
    topPlayerAvatarPlaceholder: {
        backgroundColor: '#1a1a1a',
        justifyContent: 'center',
        alignItems: 'center',
    },
    topPlayerInitials: {
        color: '#87a96b',
        fontSize: 16,
        fontWeight: 'bold',
    },
    topPlayerName: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
        marginTop: 10,
        textAlign: 'center',
    },
    topPlayerFargo: {
        color: '#666',
        fontSize: 11,
        marginTop: 4,
    },
    // Recent Matches
    matchCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 12,
        padding: 15,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    matchContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    matchResult: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    matchWinner: {
        color: '#ffd700',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 8,
    },
    matchScore: {
        color: '#87a96b',
        fontSize: 16,
        fontWeight: 'bold',
        paddingHorizontal: 12,
    },
    matchLoser: {
        color: '#888',
        fontSize: 14,
        flex: 1,
        textAlign: 'right',
    },
    matchMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.05)',
    },
    matchGameType: {
        color: '#555',
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    matchTime: {
        color: '#444',
        fontSize: 11,
    },
    emptyMatches: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 12,
        padding: 30,
        alignItems: 'center',
    },
    emptyMatchesText: {
        color: '#555',
        fontSize: 14,
    },
    bottomPadding: {
        height: 100,
    },
    // Guest Mode Styles
    guestBanner: {
        margin: 15,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 16,
        padding: 30,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    guestIconWrap: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    guestTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    guestSubtitle: {
        color: '#666',
        fontSize: 14,
        marginTop: 6,
        textAlign: 'center',
    },
    guestSignUpBtn: {
        backgroundColor: '#87a96b',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 12,
        marginTop: 20,
    },
    guestSignUpText: {
        color: '#000',
        fontSize: 15,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    // Skeleton Styles
    skeletonContainer: {
        padding: 15,
    },
    skeletonHeader: {
        marginBottom: 20,
    },
    skeletonStatsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
});
