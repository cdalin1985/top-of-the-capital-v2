import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TextInput, TouchableOpacity, Platform, Alert, RefreshControl, Image } from 'react-native';
import { supabase } from '../lib/supabase';
import { MessageSquare, Send, Heart, Award, Zap } from 'lucide-react-native';
import { SkeletonCard } from '../components/SkeletonLoader';

export default function ActivityFeedScreen() {
    const [activities, setActivities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [commentText, setCommentText] = useState<{ [key: string]: string }>({});
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    async function fetchActivities(isRefresh = false) {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            setCurrentUserId(user?.id || null);
            const { data, error } = await supabase.from('activities')
                .select(`*, user:user_id (display_name, avatar_url), comments (*, user:user_id (display_name)), cheers:cheers(user_id)`)
                .order('created_at', { ascending: false }).limit(50);
            if (error) throw error;
            setActivities(data || []);
        } catch (error: any) {
            console.error('Error:', error.message);
            Alert.alert('Error', 'Failed to load feed. Pull down to refresh.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }

    useEffect(() => {
        fetchActivities();
        const sub = supabase.channel('feed-updates')
            .on('postgres_changes' as any, { event: '*', table: 'activities' }, () => fetchActivities())
            .on('postgres_changes' as any, { event: '*', table: 'cheers' }, () => fetchActivities())
            .subscribe();
        return () => { supabase.removeChannel(sub); };
    }, []);

    async function toggleCheer(activityId: string) {
        if (!currentUserId) return;
        const activity = activities.find(a => a.id === activityId);
        const hasCheered = activity?.cheers?.some((c: any) => c.user_id === currentUserId);
        try {
            if (hasCheered) {
                await supabase.from('cheers').delete().eq('activity_id', activityId).eq('user_id', currentUserId);
            } else {
                await supabase.from('cheers').insert({ activity_id: activityId, user_id: currentUserId });
            }
            fetchActivities();
        } catch (err: any) { console.error('Cheer error:', err); }
    }

    async function postComment(activityId: string) {
        const text = commentText[activityId]?.trim();
        if (!text || !currentUserId) return;
        try {
            const { error } = await supabase.from('comments').insert({ activity_id: activityId, user_id: currentUserId, content: text });
            if (error) throw error;
            setCommentText({ ...commentText, [activityId]: '' });
            fetchActivities();
        } catch (err: any) { Alert.alert('Error', err.message); }
    }

    const renderContent = (item: any) => {
        if (item.action_type === 'MATCH_COMPLETED') {
            return (
                <View style={styles.matchCard}>
                    <View style={styles.matchHeader}><Award size={14} color="#ffd700" /><Text style={styles.matchHeaderText}>MATCH RESULT</Text></View>
                    <Text style={styles.matchText}><Text style={styles.highlight}>{item.metadata.winner_name}</Text> wins!</Text>
                    <View style={styles.scoreRow}>
                        <Text style={styles.scoreName}>{item.metadata.challenger_name}</Text>
                        <View style={styles.scorePill}><Text style={styles.scoreText}>{item.metadata.final_score}</Text></View>
                        <Text style={styles.scoreName}>{item.metadata.challenged_name}</Text>
                    </View>
                    <Text style={styles.gameTag}>{item.metadata.game_type?.toUpperCase()}</Text>
                </View>
            );
        }
        return <Text style={styles.actionText}>{item.action_type}</Text>;
    };

    const renderItem = ({ item }: { item: any }) => {
        const hasCheered = item.cheers?.some((c: any) => c.user_id === currentUserId);
        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    {item.user?.avatar_url ? <Image source={{ uri: item.user.avatar_url }} style={styles.avatar} /> : <Zap size={16} color="#87a96b" />}
                    <Text style={styles.userName}>{item.user?.display_name || 'System'}</Text>
                    <Text style={styles.timeText}>{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                </View>
                {renderContent(item)}
                <View style={styles.actionBar}>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => toggleCheer(item.id)}>
                        <Heart size={16} color={hasCheered ? '#ff4444' : '#666'} fill={hasCheered ? '#ff4444' : 'transparent'} />
                        <Text style={[styles.actionText, hasCheered && styles.cheeredText]}>{item.cheers?.length || 0}</Text>
                    </TouchableOpacity>
                    <View style={styles.actionBtn}>
                        <MessageSquare size={16} color="#666" />
                        <Text style={styles.actionText}>{item.comments?.length || 0}</Text>
                    </View>
                </View>
                {item.comments?.length > 0 && (
                    <View style={styles.comments}>
                        {item.comments.slice(0, 3).map((c: any) => (
                            <View key={c.id} style={styles.comment}>
                                <Text style={styles.commentUser}>{c.user?.display_name}: </Text>
                                <Text style={styles.commentContent}>{c.content}</Text>
                            </View>
                        ))}
                    </View>
                )}
                <View style={styles.inputRow}>
                    <TextInput style={styles.input} placeholder="Add comment..." placeholderTextColor="#444"
                        value={commentText[item.id] || ''} onChangeText={(t) => setCommentText({ ...commentText, [item.id]: t })} />
                    <TouchableOpacity onPress={() => postComment(item.id)}><Send size={18} color="#87a96b" /></TouchableOpacity>
                </View>
            </View>
        );
    };

    const renderSkeletons = () => <View>{[1,2,3].map(i => <SkeletonCard key={i} />)}</View>;
    const renderEmpty = () => loading ? null : (
        <View style={styles.empty}><MessageSquare size={48} color="#333" /><Text style={styles.emptyText}>No activity yet</Text></View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <MessageSquare color="#87a96b" size={28} />
                <Text style={styles.title}>LEAGUE FEED</Text>
            </View>
            <FlatList data={loading ? [] : activities} renderItem={renderItem} keyExtractor={(item) => item.id}
                ListEmptyComponent={loading ? renderSkeletons : renderEmpty} contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchActivities(true)} tintColor="#87a96b" />} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0a0a0a' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 60, backgroundColor: 'rgba(255,255,255,0.03)' },
    title: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginLeft: 12 },
    list: { padding: 15, flexGrow: 1 },
    card: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 16, marginBottom: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    avatar: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: '#87a96b' },
    userName: { color: '#87a96b', fontWeight: '600', marginLeft: 10, flex: 1, fontSize: 14 },
    timeText: { color: '#444', fontSize: 11 },
    matchCard: { backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: 14, marginBottom: 10 },
    matchHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    matchHeaderText: { color: '#666', fontSize: 10, fontWeight: 'bold', letterSpacing: 1, marginLeft: 6 },
    matchText: { color: '#fff', fontSize: 15 },
    highlight: { color: '#ffd700', fontWeight: 'bold' },
    scoreRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginVertical: 12 },
    scoreName: { color: '#888', fontSize: 13, flex: 1, textAlign: 'center' },
    scorePill: { backgroundColor: '#1a1a1a', paddingHorizontal: 14, paddingVertical: 4, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(135,169,107,0.3)' },
    scoreText: { color: '#87a96b', fontWeight: 'bold', fontSize: 14 },
    gameTag: { color: '#444', fontSize: 10, textAlign: 'center', fontWeight: 'bold' },
    actionText: { color: '#aaa', fontSize: 14 },
    actionBar: { flexDirection: 'row', paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', gap: 20 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    cheeredText: { color: '#ff4444' },
    comments: { backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 10, marginTop: 12 },
    comment: { flexDirection: 'row', marginBottom: 6 },
    commentUser: { color: '#87a96b', fontWeight: '600', fontSize: 12 },
    commentContent: { color: '#aaa', fontSize: 12, flex: 1 },
    inputRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, backgroundColor: 'rgba(255,255,255,0.02)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
    input: { flex: 1, color: '#fff', fontSize: 13 },
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
    emptyText: { color: '#666', fontSize: 16, marginTop: 12 },
});
