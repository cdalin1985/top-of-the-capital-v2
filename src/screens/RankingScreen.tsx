import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { Profile, GameType } from '../types';
import { Trophy, Swords } from 'lucide-react-native';

export default function RankingScreen({ navigation }: any) {
    const [rankings, setRankings] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [gameType, setGameType] = useState<GameType>('8-ball');

    const [activeMatches, setActiveMatches] = useState<string[]>([]);

    async function fetchRankings() {
        setLoading(true);
        try {
            // Fetch rankings for specific game type
            const { data, error } = await supabase
                .from('users_profiles')
                .select('*')
                .order('spot_rank', { ascending: true });

            if (error) throw error;
            
            // In a real Phase IV, we'd filter by game_type in the query
            // For now, we'll simulate the filter to keep Phase III moving
            setRankings(data || []);

            // Fetch live matches to show who is currently playing
            const { data: liveMatches } = await supabase
                .from('challenges')
                .select('challenger_id, challenged_id')
                .eq('status', 'live');
            
            const playingIds = (liveMatches || []).flatMap(m => [m.challenger_id, m.challenged_id]);
            setActiveMatches(playingIds);

        } catch (error: any) {
            console.error('Error fetching rankings:', error.message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchRankings();
        
        // Real-time subscription for match status changes
        const channel = supabase.channel('ranking-updates')
            .on('postgres_changes', { event: '*', table: 'challenges' }, () => fetchRankings())
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [gameType]);

    const renderItem = ({ item }: { item: Profile }) => {
        const isPlaying = activeMatches.includes(item.id);

        return (
            <View style={[styles.rankingItem, isPlaying && styles.playingItem]}>
                <View style={styles.rankContainer}>
                    <Text style={styles.rankText}>#{item.spot_rank}</Text>
                </View>
                <View style={styles.nameContainer}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.nameText}>{item.display_name}</Text>
                        {isPlaying && (
                            <View style={styles.liveBadge}>
                                <View style={styles.liveDot} />
                                <Text style={styles.liveText}>LIVE</Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.fargoText}>Fargo: {item.fargo_rating} • {item.points} pts</Text>
                </View>
                <TouchableOpacity
                    style={[styles.challengeButton, isPlaying && styles.disabledButton]}
                    onPress={() => !isPlaying && navigation.navigate('Challenge', { target: item })}
                    disabled={isPlaying}
                >
                    {isPlaying ? <Trophy size={20} color="#666" /> : <Swords size={20} color="#000" />}
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Trophy color="#ffd700" size={32} />
                <Text style={styles.title}>THE LIST</Text>
            </View>

            <View style={styles.tabContainer}>
                {(['8-ball', '9-ball', '10-ball'] as GameType[]).map((t) => (
                    <TouchableOpacity
                        key={t}
                        style={[styles.tab, gameType === t && styles.activeTab]}
                        onPress={() => setGameType(t)}
                    >
                        <Text style={[styles.tabText, gameType === t && styles.activeTabText]}>{t.toUpperCase()}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <FlatList
                data={rankings}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={loading} onRefresh={fetchRankings} tintColor="#87a96b" />
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
    header: {
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
        fontFamily: Platform.OS === 'ios' ? 'Cinzel Decorative' : 'serif',
    },
    tabContainer: {
        flexDirection: 'row',
        padding: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
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
        padding: 10,
    },
    rankingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 12,
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
