import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Linking, Alert, RefreshControl } from 'react-native';
import { Video, Play, ExternalLink, Radio } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { SkeletonCard } from '../components/SkeletonLoader';

export default function StreamingScreen() {
    const [streams, setStreams] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    async function fetchStreams(isRefresh = false) {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        try {
            const { data, error } = await supabase.from('challenges')
                .select('*, challenger:challenger_id(display_name), challenged:challenged_id(display_name)')
                .eq('status', 'live');
            if (error) throw error;
            setStreams(data || []);
        } catch (error: any) {
            console.error('Error:', error.message);
            Alert.alert('Error', 'Failed to load streams');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }

    useEffect(() => {
        fetchStreams();
        const channel = supabase.channel('arena-updates')
            .on('postgres_changes' as any, { event: '*', table: 'challenges' }, () => fetchStreams())
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, []);

    const openStream = (url: string) => {
        if (url) Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open stream'));
        else Alert.alert('No Stream', 'This match is live but not streaming externally.');
    };

    const renderStream = ({ item }: { item: any }) => (
        <View style={styles.card}>
            <View style={styles.cardTop}>
                <View style={styles.liveBadge}><Radio size={12} color="#fff" /><Text style={styles.liveText}>LIVE</Text></View>
                <Text style={styles.gameInfo}>{item.game_type?.toUpperCase()} | Race to {item.games_to_win}</Text>
            </View>
            <View style={styles.matchup}>
                <Text style={styles.player}>{item.challenger?.display_name || 'Player 1'}</Text>
                <Text style={styles.vs}>VS</Text>
                <Text style={styles.player}>{item.challenged?.display_name || 'Player 2'}</Text>
            </View>
            {item.stream_url && (
                <TouchableOpacity style={styles.watchBtn} onPress={() => openStream(item.stream_url)} accessibilityLabel="Watch stream">
                    <Play size={18} color="#000" fill="#000" />
                    <Text style={styles.watchText}>WATCH STREAM</Text>
                    <ExternalLink size={14} color="#000" />
                </TouchableOpacity>
            )}
        </View>
    );

    const renderEmpty = () => {
        if (loading) return <View style={styles.skeletons}><SkeletonCard /><SkeletonCard /></View>;
        return (
            <View style={styles.emptyBox}>
                <Video size={48} color="rgba(255,255,255,0.1)" />
                <Text style={styles.emptyTitle}>No Live Matches</Text>
                <Text style={styles.emptySub}>When players start a match and go live, it will appear here.</Text>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Video size={28} color="#87a96b" />
                <Text style={styles.title}>LIVE ARENA</Text>
                {streams.length > 0 && <View style={styles.countBadge}><Text style={styles.countText}>{streams.length}</Text></View>}
            </View>
            <FlatList data={streams} renderItem={renderStream} keyExtractor={(item) => item.id}
                ListEmptyComponent={renderEmpty} contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchStreams(true)} tintColor="#87a96b" />} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0a0a0a' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 60, backgroundColor: 'rgba(255,255,255,0.03)' },
    title: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginLeft: 12, flex: 1 },
    countBadge: { backgroundColor: '#f44336', width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    countText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
    list: { padding: 15, flexGrow: 1 },
    skeletons: { padding: 15 },
    card: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 18, marginBottom: 15, borderWidth: 1, borderColor: 'rgba(135,169,107,0.3)' },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    liveBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f44336', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 15 },
    liveText: { color: '#fff', fontSize: 10, fontWeight: 'bold', marginLeft: 5 },
    gameInfo: { color: '#666', fontSize: 11, fontWeight: 'bold' },
    matchup: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
    player: { color: '#fff', fontSize: 16, fontWeight: 'bold', flex: 1, textAlign: 'center' },
    vs: { color: '#87a96b', fontSize: 13, fontWeight: 'bold', marginHorizontal: 15 },
    watchBtn: { backgroundColor: '#87a96b', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 10 },
    watchText: { color: '#000', fontWeight: 'bold', fontSize: 13, marginHorizontal: 8 },
    emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 100 },
    emptyTitle: { color: 'rgba(255,255,255,0.3)', fontSize: 18, fontWeight: 'bold', marginTop: 16 },
    emptySub: { color: '#444', textAlign: 'center', marginTop: 8, paddingHorizontal: 40, fontSize: 14 },
});
