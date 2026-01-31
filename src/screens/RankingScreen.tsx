import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, Platform, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { Profile, GameType } from '../types';
import { Trophy, Swords, Star } from 'lucide-react-native';
import { SkeletonRankingItem } from '../components/SkeletonLoader';

export default function RankingScreen({ navigation }: any) {
    const [rankings, setRankings] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [gameType, setGameType] = useState<GameType>('8-ball');
    const [activeMatches, setActiveMatches] = useState<string[]>([]);
    const [spotlightPlayer, setSpotlightPlayer] = useState<Profile | null>(null);

    async function fetchRankings(isRefresh = false) {
        if (isRefresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }
        
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('ladder_rank', { ascending: true });

            if (error) throw error;
            setRankings(data || []);

            // Pick a spotlight player (Top 20)
            if (data && data.length > 0) {
                const top20 = data.slice(0, 20);
                const random = top20[Math.floor(Math.random() * top20.length)];
                setSpotlightPlayer(random);
            }

            const { data: liveMatches } = await supabase
                .from('challenges')
                .select('challenger_id, challenged_id')
                .eq('status', 'live');
            
            const playingIds = (liveMatches || []).flatMap(m => [m.challenger_id, m.challenged_id]);
            setActiveMatches(playingIds);

        } catch (error: any) {
            console.error('Error fetching rankings:', error.message);
            Alert.alert('Error', 'Failed to load rankings. Pull down to refresh.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }

    useEffect(() => {
        fetchRankings();

        // Real-time subscription for ranking changes
        const channel = supabase
            .channel('rankings-changes')
            .on(
                'postgres_changes' as any,
                { event: '*', table: 'profiles' },
                () => fetchRankings()
            )
            .on(
                'postgres_changes' as any,
                { event: '*', table: 'challenges' },
                () => fetchRankings()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const renderHeader = () => (
        <View>
            <View style={styles.mainHeader}>
                <Trophy color="#ffd700" size={32} />
                <Text style={styles.title}>THE LIST</Text>
            </View>

            {spotlightPlayer && (
                <View style={styles.spotlightCard}>
                    <View style={styles.spotlightContent}>
                        <View style={styles.spotlightIcon}>
                            <Star color="#ffd700" size={20} fill="#ffd700" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.spotlightLabel}>TODAY'S SPOTLIGHT</Text>
                            <Text style={styles.spotlightName}>{spotlightPlayer.full_name}</Text>
                            <Text style={styles.spotlightSub}>
                                Rank #{spotlightPlayer.ladder_rank} | Fargo {spotlightPlayer.fargo_rating}
                            </Text>
                        </View>
                        <TouchableOpacity 
                            style={styles.spotlightAction}
                            onPress={() => navigation.navigate('Challenge', { target: spotlightPlayer })}
                            accessibilityLabel={`Challenge ${spotlightPlayer.full_name}`}
                        >
                            <Swords color="#000" size={20} />
                        </TouchableOpacity>
                    </View>
                </View>
            )}

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
        </View>
    );

    const renderSkeletons = () => (
        <View>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <SkeletonRankingItem key={i} />
            ))}
        </View>
    );

    const renderItem = ({ item }: { item: Profile }) => {
        const isPlaying = activeMatches.includes(item.id);

        return (
            <TouchableOpacity
                style={[styles.rankingItem, isPlaying && styles.playingItem]}
                onPress={() => !isPlaying && navigation.navigate('Challenge', { target: item })}
                disabled={isPlaying}
                accessibilityLabel={`${item.full_name}, Rank ${item.ladder_rank}`}
            >
                <View style={styles.rankContainer}>
                    <Text style={styles.rankText}>#{item.ladder_rank}</Text>
                </View>
                <View style={styles.nameContainer}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.nameText}>{item.full_name}</Text>
                        {isPlaying && (
                            <View style={styles.liveBadge}>
                                <View style={styles.liveDot} />
                                <Text style={styles.liveText}>LIVE</Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.fargoText}>
                        Fargo: {item.fargo_rating} | {item.points} pts
                    </Text>
                </View>
                <View style={[styles.challengeButton, isPlaying && styles.disabledButton]}>
                    {isPlaying ? (
                        <Trophy size={20} color="#666" />
                    ) : (
                        <Swords size={20} color="#000" />
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <FlatList
                data={loading ? [] : rankings}
                renderItem={renderItem}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={loading ? renderSkeletons : null}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl 
                        refreshing={refreshing} 
                        onRefresh={() => fetchRankings(true)} 
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
    spotlightCard: {
        margin: 15,
        padding: 2,
        borderRadius: 15,
        backgroundColor: 'rgba(255, 215, 0, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255, 215, 0, 0.3)',
    },
    spotlightContent: {
        backgroundColor: '#111',
        borderRadius: 13,
        padding: 15,
        flexDirection: 'row',
        alignItems: 'center',
    },
    spotlightIcon: {
        marginRight: 15,
    },
    spotlightLabel: {
        color: '#ffd700',
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 1,
        marginBottom: 2,
    },
    spotlightName: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    spotlightSub: {
        color: '#666',
        fontSize: 12,
    },
    spotlightAction: {
        backgroundColor: '#ffd700',
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 10,
    },
    tabContainer: {
        flexDirection: 'row',
        padding: 10,
        marginHorizontal: 10,
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
    listContent: {
        paddingBottom: 100,
    },
    rankingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 12,
        marginHorizontal: 15,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    rankContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(135, 169, 107, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    rankText: {
        color: '#87a96b',
        fontWeight: 'bold',
        fontSize: 16,
    },
    nameContainer: {
        flex: 1,
    },
    nameText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    fargoText: {
        color: '#888',
        fontSize: 12,
    },
    challengeButton: {
        backgroundColor: '#87a96b',
        padding: 10,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    disabledButton: {
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    playingItem: {
        borderColor: 'rgba(135, 169, 107, 0.5)',
        borderWidth: 2,
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
        fontSize: 10,
        fontWeight: 'bold',
    },
});
