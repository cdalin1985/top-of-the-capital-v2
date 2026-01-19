import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, Platform, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { Challenge } from '../types';
import { Bell, Clock, MapPin, Check, X } from 'lucide-react-native';
import { SkeletonCard } from '../components/SkeletonLoader';

export default function InboxScreen({ navigation }: any) {
    const [challenges, setChallenges] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    async function fetchChallenges(isRefresh = false) {
        if (isRefresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }
        
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase
                .from('users_profiles')
                .select('id')
                .eq('owner_id', user.id)
                .single();

            if (!profile) return;
            setCurrentUserId(profile.id);

            const { data, error } = await supabase
                .from('challenges')
                .select(`
                    *,
                    challenger:challenger_id (display_name),
                    challenged:challenged_id (display_name)
                `)
                .or(`challenger_id.eq.${profile.id},challenged_id.eq.${profile.id}`)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setChallenges(data || []);
        } catch (error: any) {
            console.error('Error fetching challenges:', error.message);
            Alert.alert('Error', 'Failed to load inbox. Pull down to refresh.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }

    useEffect(() => {
        fetchChallenges();

        // Real-time subscription
        const channel = supabase
            .channel('inbox-changes')
            .on(
                'postgres_changes' as any,
                { event: '*', table: 'challenges' },
                () => fetchChallenges()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    async function respondToChallenge(challenge: Challenge, status: 'negotiating' | 'forfeited', venue?: string, time?: string) {
        try {
            const { error } = await supabase
                .from('challenges')
                .update({
                    status,
                    venue: venue || challenge.venue,
                    proposed_time: time || challenge.proposed_time,
                    updated_at: new Date().toISOString()
                })
                .eq('id', challenge.id);

            if (error) throw error;
            Alert.alert('Success', `Challenge ${status === 'negotiating' ? 'accepted' : 'declined'}.`);
            if (status === 'negotiating') {
                navigation.navigate('Scoreboard', { challenge: { ...challenge, status: 'negotiating' } });
            }
            fetchChallenges();
        } catch (error: any) {
            Alert.alert('Error', error.message);
        }
    }

    const renderSkeletons = () => (
        <View>
            {[1, 2, 3, 4].map((i) => (
                <SkeletonCard key={i} />
            ))}
        </View>
    );

    const renderItem = ({ item }: { item: any }) => {
        const isChallenger = item.challenger_id === currentUserId;
        const canRespond = item.status === 'pending' && item.challenged_id === currentUserId;

        const deadline = new Date(item.deadline);
        const now = new Date();
        const daysLeft = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const expirationText = daysLeft > 0 ? `${daysLeft}d left` : 'Expiring soon';

        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Text style={styles.challengerText}>
                        {isChallenger ? `You challenged ${item.challenged?.display_name}` : `${item.challenger?.display_name} challenged you`}
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                        <Text style={styles.statusText}>
                            {item.status === 'pending' ? expirationText.toUpperCase() : item.status.toUpperCase()}
                        </Text>
                    </View>
                </View>

                <View style={styles.details}>
                    <Text style={styles.detailText}>{item.game_type} | Race to {item.games_to_win}</Text>
                    <View style={styles.detailRow}>
                        <Clock size={14} color="#888" />
                        <Text style={styles.detailText}> {new Date(item.proposed_time).toLocaleString()}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <MapPin size={14} color="#888" />
                        <Text style={styles.detailText}> {item.venue || 'TBD'}</Text>
                    </View>
                </View>

                {canRespond && (
                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={[styles.actionBtn, styles.acceptBtn]}
                            onPress={() => respondToChallenge(item, 'negotiating', 'Eagles 4040', new Date(Date.now() + 86400000).toISOString())}
                            accessibilityLabel="Accept challenge"
                        >
                            <Check size={20} color="#000" />
                            <Text style={styles.acceptBtnText}>Accept</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionBtn, styles.declineBtn]}
                            onPress={() => respondToChallenge(item, 'forfeited')}
                            accessibilityLabel="Decline challenge"
                        >
                            <X size={20} color="#ff5252" />
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    const renderEmpty = () => {
        if (loading) return null;
        return (
            <View style={styles.emptyContainer}>
                <Bell size={48} color="#333" />
                <Text style={styles.emptyText}>No challenges yet</Text>
                <Text style={styles.emptySubtext}>Challenge someone from The List!</Text>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Bell size={32} color="#87a96b" />
                <Text style={styles.title}>INBOX</Text>
            </View>

            <FlatList
                data={loading ? [] : challenges}
                renderItem={renderItem}
                ListEmptyComponent={loading ? renderSkeletons : renderEmpty}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl 
                        refreshing={refreshing} 
                        onRefresh={() => fetchChallenges(true)} 
                        tintColor="#87a96b" 
                    />
                }
            />
        </View>
    );
}

function getStatusColor(status: string) {
    switch (status) {
        case 'pending': return '#ff9800';
        case 'negotiating': return '#2196f3';
        case 'scheduled': return '#4caf50';
        case 'live': return '#f44336';
        case 'completed': return '#87a96b';
        default: return '#666';
    }
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
    },
    listContent: {
        padding: 15,
        flexGrow: 1,
    },
    card: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 15,
        padding: 20,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 15,
    },
    challengerText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        flex: 1,
        marginRight: 10,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statusText: {
        color: '#000',
        fontSize: 10,
        fontWeight: 'bold',
    },
    details: {
        marginBottom: 15,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 5,
    },
    detailText: {
        color: '#aaa',
        fontSize: 14,
    },
    actions: {
        flexDirection: 'row',
    },
    actionBtn: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    acceptBtn: {
        backgroundColor: '#87a96b',
        flex: 2,
        marginRight: 10,
    },
    acceptBtnText: {
        color: '#000',
        fontWeight: 'bold',
        marginLeft: 8,
    },
    declineBtn: {
        backgroundColor: 'rgba(255, 82, 82, 0.2)',
        flex: 1,
        borderWidth: 1,
        borderColor: '#ff5252',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 100,
    },
    emptyText: {
        color: '#666',
        fontSize: 18,
        marginTop: 16,
    },
    emptySubtext: {
        color: '#444',
        fontSize: 14,
        marginTop: 4,
    },
});
