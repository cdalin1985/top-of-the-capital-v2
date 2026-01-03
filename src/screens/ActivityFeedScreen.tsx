import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { Activity, Comment } from '../types';
import { MessageSquare, Send, Zap } from 'lucide-react-native';

export default function ActivityFeedScreen() {
    const [activities, setActivities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [commentText, setCommentText] = useState<{ [key: string]: string }>({});

    async function fetchActivities() {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('activities')
                .select(`
          *,
          user:user_id (display_name, avatar_url),
          comments (
            *,
            user:user_id (display_name)
          )
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

        // Subscribe to new activities
        const subscription = supabase
            .channel('activities')
            .on('postgres_changes' as any, { event: 'INSERT', table: 'activities' }, () => fetchActivities())
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, []);

    async function postComment(activityId: string) {
        const text = commentText[activityId];
        if (!text) return;

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not logged in');

            const { error } = await supabase.from('comments').insert({
                activity_id: activityId,
                user_id: user.id,
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
                        <Text style={styles.activityAction}>
                            <Text style={styles.winnerHighlight}>{item.metadata.winner_name}</Text> won the match!
                        </Text>
                        <View style={styles.scoreBoard}>
                            <Text style={styles.scoreText}>{item.metadata.challenger_name}</Text>
                            <Text style={styles.scoreValue}>{item.metadata.final_score}</Text>
                            <Text style={styles.scoreText}>{item.metadata.challenged_name}</Text>
                        </View>
                    </View>
                );
            case 'MATCH_WON': // Fallback for the SQL function's internal log
                return (
                    <Text style={styles.activityAction}>
                        Beat their opponent and climbed to rank #{item.metadata.new_rank}!
                    </Text>
                );
            default:
                return <Text style={styles.activityAction}>{item.action_type}</Text>;
        }
    };

    const renderItem = ({ item }: { item: any }) => (
        <View style={styles.activityCard}>
            <View style={styles.activityHeader}>
                <Zap size={16} color="#87a96b" />
                <Text style={styles.activityUser}>{item.user?.display_name || 'System'}</Text>
                <Text style={styles.activityTime}>{new Date(item.created_at).toLocaleTimeString()}</Text>
            </View>
            
            {renderActivityContent(item)}

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
                    placeholder="Add a comment..."
                    placeholderTextColor="#666"
                    value={commentText[item.id] || ''}
                    onChangeText={(text) => setCommentText({ ...commentText, [item.id]: text })}
                />
                <TouchableOpacity onPress={() => postComment(item.id)}>
                    <Send size={20} color="#87a96b" />
                </TouchableOpacity>
            </View>
        </View>
    );

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
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 15,
        padding: 15,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    activityHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    activityUser: {
        color: '#87a96b',
        fontWeight: 'bold',
        marginLeft: 10,
        flex: 1,
    },
    activityTime: {
        color: '#666',
        fontSize: 12,
    },
    activityAction: {
        color: '#fff',
        fontSize: 16,
        marginBottom: 10,
    },
    matchResult: {
        paddingVertical: 5,
    },
    winnerHighlight: {
        color: '#ffd700',
        fontWeight: 'bold',
    },
    scoreBoard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
        padding: 10,
        borderRadius: 8,
        marginVertical: 10,
    },
    scoreText: {
        color: '#aaa',
        fontSize: 12,
        flex: 1,
        textAlign: 'center',
    },
    scoreValue: {
        color: '#87a96b',
        fontSize: 18,
        fontWeight: 'bold',
        flex: 1,
        textAlign: 'center',
    },
    commentSection: {
        backgroundColor: 'rgba(0,0,0,0.2)',
        borderRadius: 10,
        padding: 10,
        marginBottom: 10,
    },
    commentItem: {
        flexDirection: 'row',
        marginBottom: 5,
    },
    commentUser: {
        color: '#87a96b',
        fontWeight: 'bold',
        fontSize: 13,
    },
    commentContent: {
        color: '#ccc',
        fontSize: 13,
        flex: 1,
    },
    commentInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
        paddingTop: 10,
    },
    commentInput: {
        flex: 1,
        color: '#fff',
        fontSize: 14,
        marginRight: 10,
    },
});
