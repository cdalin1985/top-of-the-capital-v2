import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform, Vibration } from 'react-native';
import * as Haptics from 'expo-haptics';
import { supabase } from '../lib/supabase';
import { Challenge } from '../types';
import { sendPushNotification } from '../lib/notifications';
import { Maximize2, RotateCcw, Share2, Trophy } from 'lucide-react-native';

export default function ScoreboardScreen({ route, navigation }: any) {
    const { challenge } = route.params as { challenge: any };
    const [score1, setScore1] = useState(0);
    const [score2, setScore2] = useState(0);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const channel = supabase.channel(`match:${challenge.id}`)
            .on('broadcast', { event: 'score-update' }, (payload: any) => {
                setScore1(payload.payload.score1);
                setScore2(payload.payload.score2);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [challenge.id]);

    const updateScore = async (player: 1 | 2, delta: number) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        const newScore1 = player === 1 ? Math.max(0, score1 + delta) : score1;
        const newScore2 = player === 2 ? Math.max(0, score2 + delta) : score2;

        setScore1(newScore1);
        setScore2(newScore2);

        // Broadcast update
        await supabase.channel(`match:${challenge.id}`).send({
            type: 'broadcast',
            event: 'score-update',
            payload: { score1: newScore1, score2: newScore2 },
        });
    };

    const finalizeMatch = async () => {
        setLoading(true);
        try {
            const isChallengerWinner = score1 >= challenge.games_to_win;
            const winnerId = isChallengerWinner ? challenge.challenger_id : challenge.challenged_id;
            const loserId = isChallengerWinner ? challenge.challenged_id : challenge.challenger_id;
            const winnerName = isChallengerWinner ? (challenge.challenger?.display_name || 'Challenger') : (challenge.challenged?.display_name || 'Opponent');

            // Victory Vibration Pattern
            if (Platform.OS !== 'web') {
                Vibration.vibrate([0, 500, 200, 500]);
            }

            // 1. Mark challenge as completed
            const { error: challengeError } = await supabase
                .from('challenges')
                .update({
                    status: 'completed',
                    updated_at: new Date().toISOString()
                })
                .eq('id', challenge.id);

            if (challengeError) throw challengeError;

            // 2. Update Rankings (Atomic shift in DB)
            const { error: rankError } = await supabase.rpc('update_rankings_on_win', {
                match_winner_id: winnerId,
                match_loser_id: loserId
            });

            if (rankError) throw rankError;

            // 3. Log Activity
            await supabase.from('activities').insert({
                user_id: winnerId,
                action_type: 'MATCH_COMPLETED',
                metadata: {
                    challenger_name: challenge.challenger?.display_name || 'Unknown',
                    challenged_name: challenge.challenged?.display_name || 'Unknown',
                    final_score: `${score1} - ${score2}`,
                    winner_name: winnerName,
                    game_type: challenge.game_type
                }
            });

            // 4. Award Points
            await supabase.rpc('increment_points_secure', { amount: 3 }); // 3 points for finishing/winning

            Alert.alert('Match Complete', `${winnerName} wins the match!`, [
                { text: 'View Rankings', onPress: () => navigation.navigate('Rankings') }
            ]);
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    const startStreaming = () => {
        Alert.prompt(
            'Go Live',
            'Paste your YouTube or Facebook Live URL to broadcast this match to the league.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Start Streaming',
                    onPress: async (url: string | undefined) => {
                        if (url) {
                            const { error } = await supabase
                                .from('challenges')
                                .update({ stream_url: url })
                                .eq('id', challenge.id);

                            if (error) {
                                Alert.alert('Error', error.message);
                            } else {
                                // NOTIFY THE WHOLE LEAGUE
                                const { data: profiles } = await supabase
                                    .from('users_profiles')
                                    .select('expo_push_token')
                                    .not('expo_push_token', 'is', null);

                                if (profiles) {
                                    const p1 = challenge.challenger?.display_name || 'Player 1';
                                    const p2 = challenge.challenged?.display_name || 'Player 2';

                                    // Send to everyone in the league
                                    profiles.forEach(p => {
                                        if (p.expo_push_token) {
                                            sendPushNotification(
                                                p.expo_push_token,
                                                'Match LIVE! 🎥',
                                                `${p1} vs ${p2} is live in the Arena. Tap to watch!`,
                                                { type: 'LIVE_MATCH', challengeId: challenge.id }
                                            );
                                        }
                                    });
                                }
                                Alert.alert('Success', 'You are now LIVE in the Arena!');
                            }
                        }
                    }
                }
            ],
            'plain-text'
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.matchTitle}>{challenge.game_type} Race to {challenge.games_to_win}</Text>
                <TouchableOpacity onPress={startStreaming} style={styles.liveButton}>
                    <Text style={styles.liveButtonText}>GO LIVE</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.scoreboard}>
                {/* Player 1 */}
                <View style={styles.playerSection}>
                    <Text style={styles.playerName}>{challenge.challenger.display_name}</Text>
                    <View style={styles.scoreControls}>
                        <TouchableOpacity style={styles.scoreBtn} onPress={() => updateScore(1, -1)}>
                            <Text style={styles.btnText}>-</Text>
                        </TouchableOpacity>
                        <Text style={styles.scoreValue}>{score1}</Text>
                        <TouchableOpacity style={styles.scoreBtn} onPress={() => updateScore(1, 1)}>
                            <Text style={styles.btnText}>+</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.divider} />

                {/* Player 2 */}
                <View style={styles.playerSection}>
                    <Text style={styles.playerName}>{challenge.challenged.display_name}</Text>
                    <View style={styles.scoreControls}>
                        <TouchableOpacity style={styles.scoreBtn} onPress={() => updateScore(2, -1)}>
                            <Text style={styles.btnText}>-</Text>
                        </TouchableOpacity>
                        <Text style={styles.scoreValue}>{score2}</Text>
                        <TouchableOpacity style={styles.scoreBtn} onPress={() => updateScore(2, 1)}>
                            <Text style={styles.btnText}>+</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.footerIcon}>
                    <RotateCcw size={24} {...({ color: "#666" } as any)} />
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.finishBtn, (score1 < challenge.games_to_win && score2 < challenge.games_to_win) && styles.disabledFinish]}
                    onPress={finalizeMatch}
                    disabled={loading || (score1 < challenge.games_to_win && score2 < challenge.games_to_win)}
                >
                    <Trophy size={20} {...({ color: "#000" } as any)} />
                    <Text style={styles.finishBtnText}>FINISH MATCH</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.footerIcon}>
                    <Share2 size={24} {...({ color: "#666" } as any)} />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a0a',
    },
    header: {
        paddingTop: 60,
        paddingBottom: 20,
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    matchTitle: {
        color: '#87a96b',
        fontSize: 14,
        fontWeight: 'bold',
        letterSpacing: 2,
    },
    liveButton: {
        marginTop: 10,
        backgroundColor: '#f44336',
        paddingHorizontal: 15,
        paddingVertical: 5,
        borderRadius: 20,
    },
    liveButtonText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    scoreboard: {
        flex: 1,
        justifyContent: 'space-around',
        paddingVertical: 40,
    },
    playerSection: {
        alignItems: 'center',
    },
    playerName: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '300',
        marginBottom: 20,
        textTransform: 'uppercase',
    },
    scoreControls: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    scoreValue: {
        color: '#fff',
        fontSize: 120,
        fontWeight: 'bold',
        minWidth: 150,
        textAlign: 'center',
        fontFamily: Platform.OS === 'ios' ? 'Cinzel Decorative' : 'serif',
    },
    scoreBtn: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    btnText: {
        color: '#fff',
        fontSize: 32,
        fontWeight: '300',
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        marginHorizontal: 100,
    },
    footer: {
        flexDirection: 'row',
        padding: 30,
        paddingBottom: 50,
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    finishBtn: {
        backgroundColor: '#87a96b',
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 30,
        borderRadius: 30,
    },
    disabledFinish: {
        opacity: 0.3,
    },
    finishBtnText: {
        color: '#000',
        fontWeight: 'bold',
        marginLeft: 10,
    },
    footerIcon: {
        padding: 10,
    }
});
