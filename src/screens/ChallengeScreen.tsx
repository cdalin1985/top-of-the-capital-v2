import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { Profile, GameType } from '../types';
import { sendPushNotification } from '../lib/notifications';
import { Calendar, MapPin, Target, ChevronRight } from 'lucide-react-native';

export default function ChallengeScreen({ route, navigation }: any) {
    const { target } = route.params as { target: Profile };
    const [gameType, setGameType] = useState<GameType>('8-ball');
    const [gamesToWin, setGamesToWin] = useState(7);
    const [loading, setLoading] = useState(false);

    // Check eligibility logic (±5 spots)
    async function submitChallenge() {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data: profile } = await supabase
                .from('users_profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (!profile) throw new Error('Profile not found');

            // ±5 Rule
            const spotDiff = Math.abs(profile.spot_rank - target.spot_rank);
            const isRankOne = profile.spot_rank === 1;

            if (spotDiff > 5 && !isRankOne) {
                throw new Error('You can only challenge players within ±5 spots of your current rank.');
            }

            // 24h Cooldown Check
            if (profile.cooldown_until && new Date(profile.cooldown_until) > new Date()) {
                const waitTime = new Date(profile.cooldown_until).toLocaleTimeString();
                throw new Error(`You are on a 24-hour cooldown after your last loss until ${waitTime}.`);
            }

            const { error } = await supabase.from('challenges').insert({
                challenger_id: user.id,
                challenged_id: target.id,
                game_type: gameType,
                games_to_win: gamesToWin,
                status: 'pending',
                deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 2 weeks
                venue: 'TBD',
                proposed_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString() // 48h from now default
            });

            if (error) throw error;

            // Send Push Notification to Target
            if (target.expo_push_token) {
                await sendPushNotification(
                    target.expo_push_token,
                    'New Challenge! 🎱',
                    `${profile.display_name} has challenged you to a race to ${gamesToWin} in ${gameType}!`,
                    { type: 'CHALLENGE_RECEIVED', challengerId: user.id }
                );
            }

            // Add points for engagement (+2 for challenge)
            await supabase.rpc('increment_points', { user_id: user.id, amount: 2 });

            Alert.alert('Success', `Challenge sent to ${target.display_name}! (+2 engagement points)`, [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        } catch (error: any) {
            Alert.alert('Challenge Rejected', error.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Challenge {target.display_name}</Text>
                <Text style={styles.subtitle}>Current Rank: #{target.spot_rank}</Text>
            </View>

            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Target size={20} color="#87a96b" />
                    <Text style={styles.sectionTitle}>Game Type</Text>
                </View>
                <View style={styles.optionsGrid}>
                    {(['8-ball', '9-ball', '10-ball'] as GameType[]).map((t) => (
                        <TouchableOpacity
                            key={t}
                            style={[styles.option, gameType === t && styles.activeOption]}
                            onPress={() => setGameType(t)}
                        >
                            <Text style={[styles.optionText, gameType === t && styles.activeOptionText]}>{t}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <ChevronRight size={20} color="#87a96b" />
                    <Text style={styles.sectionTitle}>Race To (Games to Win)</Text>
                </View>
                <View style={styles.raceController}>
                    <TouchableOpacity onPress={() => setGamesToWin(Math.max(5, gamesToWin - 1))} style={styles.stepBtn}>
                        <Text style={styles.stepBtnText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.raceValue}>{gamesToWin}</Text>
                    <TouchableOpacity onPress={() => setGamesToWin(Math.min(15, gamesToWin + 1))} style={styles.stepBtn}>
                        <Text style={styles.stepBtnText}>+</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.infoCard}>
                <Text style={styles.infoText}>
                    The challenged player will choose the venue (Eagles 4040/Valley Hub) and the match time.
                </Text>
            </View>

            <TouchableOpacity
                style={[styles.submitBtn, loading && styles.disabledBtn]}
                onPress={submitChallenge}
                disabled={loading}
            >
                <Text style={styles.submitBtnText}>{loading ? 'Sending...' : 'Issue Challenge'}</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a0a',
        padding: 20,
        paddingTop: 60,
    },
    header: {
        marginBottom: 30,
    },
    title: {
        fontSize: 28,
        color: '#fff',
        fontWeight: 'bold',
        fontFamily: Platform.OS === 'ios' ? 'Cinzel Decorative' : 'serif',
    },
    subtitle: {
        color: '#87a96b',
        fontSize: 18,
        marginTop: 5,
    },
    section: {
        marginBottom: 30,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        padding: 20,
        borderRadius: 15,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    sectionTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
        marginLeft: 10,
    },
    optionsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    option: {
        flex: 1,
        padding: 12,
        alignItems: 'center',
        borderRadius: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        marginHorizontal: 4,
    },
    activeOption: {
        backgroundColor: '#87a96b',
    },
    optionText: {
        color: '#aaa',
        fontWeight: '600',
    },
    activeOptionText: {
        color: '#000',
    },
    raceController: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepBtn: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepBtnText: {
        color: '#fff',
        fontSize: 24,
    },
    raceValue: {
        color: '#fff',
        fontSize: 32,
        fontWeight: 'bold',
        marginHorizontal: 30,
    },
    infoCard: {
        padding: 15,
        backgroundColor: 'rgba(135, 169, 107, 0.1)',
        borderRadius: 10,
        marginBottom: 30,
        borderLeftWidth: 4,
        borderLeftColor: '#87a96b',
    },
    infoText: {
        color: '#ccc',
        fontSize: 14,
        lineHeight: 20,
    },
    submitBtn: {
        backgroundColor: '#87a96b',
        padding: 20,
        borderRadius: 15,
        alignItems: 'center',
        marginBottom: 40,
    },
    disabledBtn: {
        opacity: 0.5,
    },
    submitBtnText: {
        color: '#000',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
