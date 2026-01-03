import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, Platform, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { Challenge, Profile } from '../types';
import { Bell, Clock, MapPin, Check, X } from 'lucide-react-native';

export default function InboxScreen({ navigation }: any) {
    const [challenges, setChallenges] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    async function fetchChallenges() {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('challenges')
                .select(`
          *,
          challenger:challenger_id (display_name),
          challenged:challenged_id (display_name)
        `)
                .or(`challenger_id.eq.${user.id},challenged_id.eq.${user.id}`)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setChallenges(data || []);
        } catch (error: any) {
            console.error('Error fetching challenges:', error.message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchChallenges();
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

    const renderItem = ({ item }: { item: any }) => {
        const currentUserId = supabase.auth.getSession().then(({data}) => data.session?.user.id);
        const isChallenger = item.challenger_id === currentUserId;
        const canRespond = item.status === 'pending' && item.challenged_id === currentUserId;

        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Text style={styles.challengerText}>
                        {isChallenger ? `You challenged ${item.challenged.display_name}` : `${item.challenger.display_name} challenged you`}
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                        <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
                    </View>
                </View>

                <View style={styles.details}>
                    <Text style={styles.detailText}>{item.game_type} • Race to {item.games_to_win}</Text>
                    <Text style={styles.detailText}><Clock size={14} color="#888" /> {new Date(item.proposed_time).toLocaleString()}</Text>
                    <Text style={styles.detailText}><MapPin size={14} color="#888" /> {item.venue || 'TBD'}</Text>
                </View>

                {canRespond && (
                    <View style={styles.actions}>
                        <TouchableOpacity
                            style={[styles.actionBtn, styles.acceptBtn]}
                            onPress={() => respondToChallenge(item, 'negotiating', 'Eagles 4040', new Date(Date.now() + 86400000).toISOString())}
                        >
                            <Check size={20} color="#000" />
                            <Text style={styles.acceptBtnText}>Accept (Eagles 4040)</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionBtn, styles.declineBtn]}
                            onPress={() => respondToChallenge(item, 'forfeited')}
                        >
                            <X size={20} color="#fff" />
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Bell color="#87a96b" size={32} />
                <Text style={styles.title}>INBOX</Text>
            </View>

            <FlatList
                data={challenges}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={loading} onRefresh={fetchChallenges} tintColor="#87a96b" />
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
        fontFamily: Platform.OS === 'ios' ? 'Cinzel Decorative' : 'serif',
    },
    listContent: {
        padding: 15,
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
    detailText: {
        color: '#aaa',
        fontSize: 14,
        marginBottom: 5,
        flexDirection: 'row',
        alignItems: 'center',
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
});
