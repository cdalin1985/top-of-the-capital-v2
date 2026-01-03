import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { supabase } from '../lib/supabase';
import { Activity, Comment } from '../types';
import { MessageSquare, Send, Zap, Heart, Award } from 'lucide-react-native';

export default function ActivityFeedScreen() {
    const [activities, setActivities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [commentText, setCommentText] = useState<{ [key: string]: string }>({});
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    async function fetchActivities() {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            setCurrentUserId(user?.id || null);

            const { data, error } = await supabase
                .from('activities')
                .select(`
          *,
          user:user_id (display_name, avatar_url),
          comments (
            *,
            user:user_id (display_name)
          ),
          cheers:cheers(user_id)
        `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setActivities(data || []);
        } catch (error: any) {
            console.error('Error fetching activities:', error.message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchActivities();

        const subscription = supabase
            .channel('activities')
            .on('postgres_changes' as any, { event: '*', table: 'activities' }, () => fetchActivities())
            .on('postgres_changes' as any, { event: '*', table: 'cheers' }, () => fetchActivities())
            .subscribe();

        return () => { supabase.removeChannel(subscription); };
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
        } catch (error: any) {
            console.error('Error toggling cheer:', error.message);
        }
    }

    async function postComment(activityId: string) {
        const text = commentText[activityId];
        if (!text) return;

        try {
            const { error } = await supabase.from('comments').insert({
                activity_id: activityId,
                user_id: currentUserId,
                content: text,
            });

            if (error) throw error;
            setCommentText({ ...commentText, [activityId]: '' });
            fetchActivities();
        } catch (error: any) {
            console.error('Error posting comment:', error.message);
        }
    }

    const renderActivityContent = (item: any) => {
        switch (item.action_type) {
            case 'MATCH_COMPLETED':
                return (
                    <View style={styles.matchResult}>
                        <View style={styles.proHeader}>
                            <Award size={14} color="#ffd700" />
                            <Text style={styles.proHeaderText}>LEAGUE MATCH RESULT</Text>
                        </View>
                        <Text style={styles.activityAction}>
                            <Text style={styles.winnerHighlight}>{item.metadata.winner_name}</Text> secured a decisive victory!
                        </Text>
                        <View style={styles.scoreBoard}>
                            <View style={styles.scorePlayer}>
                                <Text style={styles.scoreText}>{item.metadata.challenger_name}</Text>
                            </View>
                            <View style={styles.scorePill}>
                                <Text style={styles.scoreValue}>{item.metadata.final_score}</Text>
                            </View>
                            <View style={styles.scorePlayer}>
                                <Text style={styles.scoreText}>{item.metadata.challenged_name}</Text>
                            </View>
                        </View>
                        <Text style={styles.gameTypeTag}>{item.metadata.game_type.toUpperCase()} ARENA</Text>
                    </View>
                );
            case 'MATCH_WON':
                return (
                    <View style={styles.rankBumper}>
                        <Text style={styles.activityAction}>
                            Ascended to <Text style={styles.rankHighlight}>Rank #{item.metadata.new_rank}</Text> on the ladder!
                        </Text>
                    </View>
                );
            default:
                return <Text style={styles.activityAction}>{item.action_type}</Text>;
        }
    };

    const renderItem = ({ item }: { item: any }) => {
        const hasCheered = item.cheers?.some((c: any) => c.user_id === currentUserId);
        
        return (
            <View style={styles.activityCard}>
                <View style={styles.activityHeader}>
                    {item.user?.avatar_url ? (
                        <Image source={{ uri: item.user.avatar_url }} style={styles.tinyAvatar} />
                    ) : (
                        <Zap size={16} color="#87a96b" />
                    )}
                    <Text style={styles.activityUser}>{item.user?.display_name || 'System'}</Text>
                    <Text style={styles.activityTime}>{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                </View>
                
                {renderActivityContent(item)}

                <View style={styles.interactionBar}>
                    <TouchableOpacity 
                        style={[styles.interactionBtn, hasCheered && styles.cheeredBtn]} 
                        onPress={() => toggleCheer(item.id)}
                    >
                        <Heart size={18} color={hasCheered ? '#ff4444' : '#666'} fill={hasCheered ? '#ff4444' : 'transparent'} />
                        <Text style={[styles.interactionText, hasCheered && styles.cheeredText]}>
                            {item.cheers?.length || 0} Cheers
                        </Text>
                    </TouchableOpacity>
                    <View style={styles.interactionBtn}>
                        <MessageSquare size={18} color="#666" />
                        <Text style={styles.interactionText}>{item.comments?.length || 0} Comments</Text>
                    </View>
                </View>

                {item.comments && item.comments.length > 0 && (
                    <View style={styles.commentSection}>
                        {item.comments.map((c: any) => (
                            <View key={c.id} style={styles.commentItem}>
                                <Text style={styles.commentUser}>{c.user.display_name}: </Text>
                                <Text style={styles.commentContent}>{c.content}</Text>
                            </View>
                        ))}
                    </View>
                )}

                <View style={styles.commentInputContainer}>
                    <TextInput
                        style={styles.commentInput}
                        placeholder="Say something encouraging..."
                        placeholderTextColor="#444"
                        value={commentText[item.id] || ''}
                        onChangeText={(text) => setCommentText({ ...commentText, [item.id]: text })}
                    />
                    <TouchableOpacity onPress={() => postComment(item.id)}>
                        <Send size={18} color="#87a96b" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <MessageSquare color="#87a96b" size={32} />
                <Text style={styles.title}>LEAGUE FEED</Text>
            </View>

            <FlatList
                data={activities}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                refreshing={loading}
                onRefresh={fetchActivities}
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
    listContent: {
        padding: 15,
    },
    activityCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    activityHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    tinyAvatar: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#87a96b',
    },
    activityUser: {
        color: '#87a96b',
        fontWeight: 'bold',
        marginLeft: 10,
        flex: 1,
    },
    activityTime: {
        color: '#444',
        fontSize: 11,
    },
    proHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 10,
    },
    proHeaderText: {
        color: '#666',
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    activityAction: {
        color: '#fff',
        fontSize: 16,
        lineHeight: 22,
    },
    matchResult: {
        paddingVertical: 10,
        backgroundColor: 'rgba(0,0,0,0.2)',
        borderRadius: 15,
        padding: 15,
        marginBottom: 10,
    },
    rankBumper: {
        paddingVertical: 10,
    },
    winnerHighlight: {
        color: '#ffd700',
        fontWeight: 'bold',
    },
    rankHighlight: {
        color: '#87a96b',
        fontWeight: 'bold',
    },
    scoreBoard: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginVertical: 15,
        gap: 15,
    },
    scorePlayer: {
        flex: 1,
    },
    scoreText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '300',
        textAlign: 'center',
    },
    scorePill: {
        backgroundColor: '#1a1a1a',
        paddingHorizontal: 15,
        paddingVertical: 5,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(135, 169, 107, 0.3)',
    },
    scoreValue: {
        color: '#87a96b',
        fontSize: 16,
        fontWeight: 'bold',
    },
    gameTypeTag: {
        color: '#444',
        fontSize: 10,
        textAlign: 'center',
        fontWeight: 'bold',
        marginTop: 5,
    },
    interactionBar: {
        flexDirection: 'row',
        marginTop: 15,
        paddingTop: 15,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
        gap: 20,
    },
    interactionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    interactionText: {
        color: '#666',
        fontSize: 12,
        fontWeight: '600',
    },
    cheeredBtn: {
        opacity: 1,
    },
    cheeredText: {
        color: '#ff4444',
    }
    commentSection: {
        backgroundColor: 'rgba(0,0,0,0.4)',
        borderRadius: 12,
        padding: 12,
        marginTop: 15,
    },
    commentItem: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    commentUser: {
        color: '#87a96b',
        fontWeight: 'bold',
        fontSize: 12,
    },
    commentContent: {
        color: '#aaa',
        fontSize: 12,
        flex: 1,
    },
    commentInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 15,
        backgroundColor: 'rgba(255,255,255,0.02)',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 10,
    },
    commentInput: {
        flex: 1,
        color: '#fff',
        fontSize: 13,
    },
});
