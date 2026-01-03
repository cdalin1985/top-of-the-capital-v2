import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, FlatList, Linking, Image } from 'react-native';
import { Video, Play, ExternalLink, Wifi } from 'lucide-react-native';
import { supabase } from '../lib/supabase';

export default function StreamingScreen() {
    const [streams, setStreams] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    async function fetchStreams() {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('challenges')
                .select('*, challenger:challenger_id(display_name, avatar_url), challenged:challenged_id(display_name, avatar_url)')
                .eq('status', 'live')
                .not('stream_url', 'is', null);

            if (error) throw error;
            setStreams(data || []);
        } catch (error) {
            console.error('Error fetching streams:', error);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchStreams();
        const channel = supabase.channel('stream-updates')
            .on('postgres_changes' as any, { event: '*', table: 'challenges' }, () => fetchStreams())
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    const renderStream = ({ item }: { item: any }) => (
        <View style={styles.streamCard}>
            <View style={styles.cardHeader}>
                <View style={styles.liveBadge}>
                    <Wifi size={14} {...({ color: "#fff" } as any)} />
                    <Text style={styles.liveText}>LIVE NOW</Text>
                </View>
                <Text style={styles.matchTitle}>{item.game_type} Race to {item.games_to_win}</Text>
            </View>

            <View style={styles.vsContainer}>
                <Text style={styles.playerText}>{item.challenger?.display_name}</Text>
                <Text style={styles.vsText}>VS</Text>
                <Text style={styles.playerText}>{item.challenged?.display_name}</Text>
            </View>

            <TouchableOpacity
                style={styles.watchBtn}
                onPress={() => Linking.openURL(item.stream_url)}
            >
                <Play size={20} {...({ color: "#000", fill: "#000" } as any)} />
                <Text style={styles.watchBtnText}>WATCH ON EXTERNAL PLAYER</Text>
                <ExternalLink size={16} {...({ color: "#000" } as any)} />
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Video size={32} {...({ color: "#87a96b" } as any)} />
                <Text style={styles.title}>LIVE ARENA</Text>
            </View>

            {streams.length > 0 ? (
                <FlatList
                    data={streams}
                    renderItem={renderStream}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    onRefresh={fetchStreams}
                    refreshing={loading}
                />
            ) : (
                <View style={styles.emptyContainer}>
                    <View style={styles.videoMock}>
                        <Video size={48} {...({ color: "rgba(255,255,255,0.1)" } as any)} />
                        <Text style={styles.placeholderText}>NO ACTIVE STREAMS</Text>
                        <Text style={styles.subtitle}>Streaming matches will appear here automatically when players go live.</Text>
                    </View>
                </View>
            )}
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
    listContent: {
        padding: 20,
    },
    streamCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(135, 169, 107, 0.3)',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    liveBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f44336',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        gap: 6,
    },
    liveText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    matchTitle: {
        color: '#666',
        fontSize: 12,
        fontWeight: 'bold',
    },
    vsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 25,
        gap: 20,
    },
    playerText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        flex: 1,
        textAlign: 'center',
    },
    vsText: {
        color: '#87a96b',
        fontSize: 14,
        fontWeight: 'bold',
        fontStyle: 'italic',
    },
    watchBtn: {
        backgroundColor: '#87a96b',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 15,
        borderRadius: 12,
        gap: 10,
    },
    watchBtnText: {
        color: '#000',
        fontWeight: 'bold',
        fontSize: 14,
    },
    emptyContainer: {
        flex: 1,
        padding: 20,
        justifyContent: 'center',
    },
    videoMock: {
        aspectRatio: 16 / 9,
        backgroundColor: '#111',
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    placeholderText: {
        color: 'rgba(255,255,255,0.3)',
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 15,
    },
    subtitle: {
        color: '#444',
        textAlign: 'center',
        marginTop: 10,
        paddingHorizontal: 40,
    },
});
