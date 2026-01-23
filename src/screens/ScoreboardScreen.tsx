import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform, Vibration, ActivityIndicator } from 'react-native';
import * as Haptics from 'expo-haptics';
import { supabase } from '../lib/supabase';
import { sendPushNotification } from '../lib/notifications';
import { RotateCcw, Share2, Trophy, Radio } from 'lucide-react-native';

export default function ScoreboardScreen({ route, navigation }: any) {
    const { challenge } = route.params as { challenge: any };
    const [score1, setScore1] = useState(0);
    const [score2, setScore2] = useState(0);
    const [loading, setLoading] = useState(false);
    const [isLive, setIsLive] = useState(false);

    useEffect(() => {
        const channel = supabase.channel(`match:${challenge.id}`)
            .on('broadcast', { event: 'score-update' }, (payload: any) => {
                setScore1(payload.payload.score1);
                setScore2(payload.payload.score2);
            })
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [challenge.id]);

    const triggerHaptic = () => {
        try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
    };

    const updateScore = async (player: 1 | 2, delta: number) => {
        triggerHaptic();
        const newScore1 = player === 1 ? Math.max(0, score1 + delta) : score1;
        const newScore2 = player === 2 ? Math.max(0, score2 + delta) : score2;
        setScore1(newScore1);
        setScore2(newScore2);
        try {
            await supabase.channel(`match:${challenge.id}`).send({
                type: 'broadcast', event: 'score-update',
                payload: { score1: newScore1, score2: newScore2 },
            });
        } catch (err) { console.error('Broadcast error:', err); }
    };

    const resetScores = () => {
        Alert.alert('Reset Scores?', 'This will set both scores to 0.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Reset', style: 'destructive', onPress: () => { setScore1(0); setScore2(0); triggerHaptic(); }}
        ]);
    };

    const finalizeMatch = async () => {
        const raceTarget = challenge.games_to_win;
        if (score1 < raceTarget && score2 < raceTarget) {
            Alert.alert('Match Not Complete', `Someone needs to reach ${raceTarget} games to win.`);
            return;
        }
        setLoading(true);
        try {
            const isChallengerWinner = score1 >= raceTarget;
            const winnerId = isChallengerWinner ? challenge.challenger_id : challenge.challenged_id;
            const loserId = isChallengerWinner ? challenge.challenged_id : challenge.challenger_id;
            const winnerName = isChallengerWinner ? (challenge.challenger?.full_name || 'Challenger') : (challenge.challenged?.full_name || 'Opponent');

            if (Platform.OS !== 'web') { Vibration.vibrate([0, 500, 200, 500]); }

            const { error: challengeError } = await supabase.from('challenges')
                .update({ status: 'completed', challenger_score: score1, challenged_score: score2, winner_id: winnerId, updated_at: new Date().toISOString() })
                .eq('id', challenge.id);
            if (challengeError) throw challengeError;

            // Update rankings
            try {
                await supabase.rpc('update_rankings_on_win', { match_winner_id: winnerId, match_loser_id: loserId });
            } catch (rankErr) { console.error('Rank update error:', rankErr); }

            // Log activity
            await supabase.from('activities').insert({
                user_id: winnerId, action_type: 'MATCH_COMPLETED',
                metadata: { challenger_name: challenge.challenger?.full_name, challenged_name: challenge.challenged?.full_name, 
                    final_score: `${score1} - ${score2}`, winner_name: winnerName, game_type: challenge.game_type }
            });

            // Apply 24h cooldown to loser
            const cooldownTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
            await supabase.from('profiles').update({ cooldown_until: cooldownTime }).eq('id', loserId);

            Alert.alert('Match Complete!', `${winnerName} wins ${score1}-${score2}!`, [
                { text: 'Back to Rankings', onPress: () => navigation.navigate('Rankings') }
            ]);
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to finalize match');
        } finally {
            setLoading(false);
        }
    };

    const goLive = async () => {
        setIsLive(true);
        try {
            await supabase.from('challenges').update({ status: 'live' }).eq('id', challenge.id);
            const { data: profiles } = await supabase.from('profiles').select('expo_push_token').not('expo_push_token', 'is', null);
            if (profiles) {
                const p1 = challenge.challenger?.full_name || 'Player 1';
                const p2 = challenge.challenged?.full_name || 'Player 2';
                profiles.forEach(p => {
                    if (p.expo_push_token) {
                        sendPushNotification(p.expo_push_token, 'Match LIVE!', `${p1} vs ${p2} is now live!`, { type: 'LIVE_MATCH' });
                    }
                });
            }
            Alert.alert('You are LIVE!', 'Other players can now see this match is happening.');
        } catch (err: any) {
            Alert.alert('Error', err.message);
            setIsLive(false);
        }
    };

    const raceTarget = challenge.games_to_win;
    const matchComplete = score1 >= raceTarget || score2 >= raceTarget;
    const p1Name = challenge.challenger?.full_name || 'Player 1';
    const p2Name = challenge.challenged?.full_name || 'Player 2';

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.matchTitle}>{challenge.game_type.toUpperCase()} | RACE TO {raceTarget}</Text>
                <TouchableOpacity onPress={goLive} style={[styles.liveBtn, isLive && styles.liveBtnActive]} disabled={isLive}>
                    <Radio size={14} color={isLive ? '#fff' : '#f44336'} />
                    <Text style={[styles.liveBtnText, isLive && styles.liveBtnTextActive]}>{isLive ? 'LIVE' : 'GO LIVE'}</Text>
                </TouchableOpacity>
            </View>
            <View style={styles.scoreboard}>
                <View style={styles.playerSection}>
                    <Text style={styles.playerName}>{p1Name}</Text>
                    <View style={styles.scoreRow}>
                        <TouchableOpacity style={styles.scoreBtn} onPress={() => updateScore(1, -1)} accessibilityLabel="Subtract point player 1">
                            <Text style={styles.btnText}>-</Text>
                        </TouchableOpacity>
                        <Text style={[styles.scoreValue, score1 >= raceTarget && styles.winnerScore]}>{score1}</Text>
                        <TouchableOpacity style={styles.scoreBtn} onPress={() => updateScore(1, 1)} accessibilityLabel="Add point player 1">
                            <Text style={styles.btnText}>+</Text>
                        </TouchableOpacity>
                    </View>
                </View>
                <View style={styles.divider}><Text style={styles.vsText}>VS</Text></View>
                <View style={styles.playerSection}>
                    <Text style={styles.playerName}>{p2Name}</Text>
                    <View style={styles.scoreRow}>
                        <TouchableOpacity style={styles.scoreBtn} onPress={() => updateScore(2, -1)} accessibilityLabel="Subtract point player 2">
                            <Text style={styles.btnText}>-</Text>
                        </TouchableOpacity>
                        <Text style={[styles.scoreValue, score2 >= raceTarget && styles.winnerScore]}>{score2}</Text>
                        <TouchableOpacity style={styles.scoreBtn} onPress={() => updateScore(2, 1)} accessibilityLabel="Add point player 2">
                            <Text style={styles.btnText}>+</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
            <View style={styles.footer}>
                <TouchableOpacity style={styles.footerBtn} onPress={resetScores}>
                    <RotateCcw size={22} color="#666" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.finishBtn, !matchComplete && styles.finishBtnDisabled]} onPress={finalizeMatch} disabled={loading || !matchComplete}>
                    {loading ? <ActivityIndicator color="#000" /> : (
                        <>
                            <Trophy size={18} color="#000" />
                            <Text style={styles.finishBtnText}>FINISH MATCH</Text>
                        </>
                    )}
                </TouchableOpacity>
                <TouchableOpacity style={styles.footerBtn}>
                    <Share2 size={22} color="#666" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0a0a0a' },
    header: { paddingTop: 60, paddingBottom: 15, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)' },
    matchTitle: { color: '#87a96b', fontSize: 12, fontWeight: 'bold', letterSpacing: 2 },
    liveBtn: { marginTop: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(244,67,54,0.1)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#f44336' },
    liveBtnActive: { backgroundColor: '#f44336', borderColor: '#f44336' },
    liveBtnText: { color: '#f44336', fontSize: 11, fontWeight: 'bold', marginLeft: 6 },
    liveBtnTextActive: { color: '#fff' },
    scoreboard: { flex: 1, justifyContent: 'space-around', paddingVertical: 30 },
    playerSection: { alignItems: 'center' },
    playerName: { color: '#888', fontSize: 18, fontWeight: '300', marginBottom: 15, textTransform: 'uppercase', letterSpacing: 1 },
    scoreRow: { flexDirection: 'row', alignItems: 'center' },
    scoreValue: { color: '#fff', fontSize: 100, fontWeight: 'bold', minWidth: 140, textAlign: 'center' },
    winnerScore: { color: '#87a96b' },
    scoreBtn: { width: 54, height: 54, borderRadius: 27, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
    btnText: { color: '#fff', fontSize: 28, fontWeight: '300' },
    divider: { alignItems: 'center', paddingVertical: 10 },
    vsText: { color: '#333', fontSize: 14, fontWeight: 'bold' },
    footer: { flexDirection: 'row', padding: 25, paddingBottom: 45, justifyContent: 'space-between', alignItems: 'center' },
    footerBtn: { padding: 12 },
    finishBtn: { backgroundColor: '#87a96b', flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 28, borderRadius: 25 },
    finishBtnDisabled: { opacity: 0.3 },
    finishBtnText: { color: '#000', fontWeight: 'bold', marginLeft: 8, fontSize: 13 },
});
