import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { Profile, GameType } from '../types';
import { sendPushNotification } from '../lib/notifications';
import { checkChallengeEligibility } from '../lib/logic';
import { Target, ChevronRight, AlertCircle, ArrowLeft, Calendar } from 'lucide-react-native';

export default function ChallengeScreen({ route, navigation }: any) {
    const { target } = route.params as { target: Profile };
    const [gameType, setGameType] = useState<GameType>('8-ball');
    const [gamesToWin, setGamesToWin] = useState(7);
    const [loading, setLoading] = useState(false);
    const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
    const [eligibility, setEligibility] = useState<{ eligible: boolean; error?: string } | null>(null);

    useEffect(() => {
        checkCurrentProfile();
    }, []);

    async function checkCurrentProfile() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('owner_id', user.id)
                .single();
            if (profile) {
                setCurrentProfile(profile);
                const result = checkChallengeEligibility(profile.ladder_rank, target.ladder_rank, profile.cooldown_until);
                setEligibility(result);
            }
        } catch (error: any) {
            console.error('Error:', error.message);
        }
    }

    async function submitChallenge() {
        if (!currentProfile || (eligibility && !eligibility.eligible)) {
            Alert.alert('Cannot Challenge', eligibility?.error || 'Not eligible');
            return;
        }
        setLoading(true);
        try {
            const { error } = await supabase.from('challenges').insert({
                challenger_id: currentProfile.id,
                challenged_id: target.id,
                game_type: gameType,
                games_to_win: gamesToWin,
                status: 'pending',
                deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
                venue: 'TBD',
                proposed_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()
            });
            if (error) throw error;
            if (target.expo_push_token) {
                await sendPushNotification(target.expo_push_token, 'New Challenge!',
                    `${currentProfile.full_name} challenged you to race to ${gamesToWin} in ${gameType}!`,
                    { type: 'CHALLENGE_RECEIVED' });
            }
            Alert.alert('Challenge Sent!', `${target.full_name} has 2 weeks to respond.`,
                [{ text: 'OK', onPress: () => navigation.goBack() }]);
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <ScrollView style={styles.container}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                <ArrowLeft size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.header}>
                <Text style={styles.headerLabel}>CHALLENGE</Text>
                <Text style={styles.targetName}>{target.full_name}</Text>
                <Text style={styles.targetInfo}>Rank #{target.ladder_rank} | Fargo {target.fargo_rating}</Text>
            </View>
            {eligibility && !eligibility.eligible && (
                <View style={styles.warning}>
                    <AlertCircle size={18} color="#ff9800" />
                    <Text style={styles.warningText}>{eligibility.error}</Text>
                </View>
            )}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Target size={18} color="#87a96b" />
                    <Text style={styles.sectionTitle}>Game Type</Text>
                </View>
                <View style={styles.options}>
                    {(['8-ball', '9-ball', '10-ball'] as GameType[]).map((t) => (
                        <TouchableOpacity key={t} style={[styles.opt, gameType === t && styles.optActive]}
                            onPress={() => setGameType(t)}>
                            <Text style={[styles.optText, gameType === t && styles.optTextActive]}>{t.toUpperCase()}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <ChevronRight size={18} color="#87a96b" />
                    <Text style={styles.sectionTitle}>Race To</Text>
                </View>
                <View style={styles.raceRow}>
                    <TouchableOpacity onPress={() => setGamesToWin(Math.max(3, gamesToWin - 1))} style={styles.stepBtn}>
                        <Text style={styles.stepText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.raceNum}>{gamesToWin}</Text>
                    <TouchableOpacity onPress={() => setGamesToWin(Math.min(13, gamesToWin + 1))} style={styles.stepBtn}>
                        <Text style={styles.stepText}>+</Text>
                    </TouchableOpacity>
                </View>
            </View>
            <View style={styles.info}>
                <Calendar size={14} color="#87a96b" />
                <Text style={styles.infoText}>{target.full_name} picks venue/time. 2 weeks to respond.</Text>
            </View>
            <TouchableOpacity style={[styles.submitBtn, (loading || !eligibility?.eligible) && styles.disabledBtn]}
                onPress={submitChallenge} disabled={loading || !eligibility?.eligible}>
                {loading ? <ActivityIndicator color="#000" /> : 
                    <Text style={styles.submitText}>{eligibility?.eligible ? 'Issue Challenge' : 'Cannot Challenge'}</Text>}
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0a0a0a', padding: 20 },
    backBtn: { marginTop: 40, width: 44, height: 44, justifyContent: 'center' },
    header: { marginBottom: 25 },
    headerLabel: { fontSize: 12, color: '#666', letterSpacing: 2 },
    targetName: { fontSize: 28, color: '#fff', fontWeight: 'bold', marginTop: 4 },
    targetInfo: { color: '#87a96b', fontSize: 14, marginTop: 6 },
    warning: { flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: 'rgba(255,152,0,0.1)', borderRadius: 10, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,152,0,0.3)' },
    warningText: { color: '#ff9800', fontSize: 13, marginLeft: 10, flex: 1 },
    section: { marginBottom: 20, backgroundColor: 'rgba(255,255,255,0.05)', padding: 18, borderRadius: 14 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
    sectionTitle: { color: '#fff', fontSize: 15, fontWeight: '600', marginLeft: 8 },
    options: { flexDirection: 'row', justifyContent: 'space-between' },
    opt: { flex: 1, padding: 12, alignItems: 'center', borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.08)', marginHorizontal: 3 },
    optActive: { backgroundColor: '#87a96b' },
    optText: { color: '#888', fontWeight: '600', fontSize: 12 },
    optTextActive: { color: '#000' },
    raceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    stepBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(135,169,107,0.2)', justifyContent: 'center', alignItems: 'center' },
    stepText: { color: '#87a96b', fontSize: 24 },
    raceNum: { color: '#fff', fontSize: 42, fontWeight: 'bold', marginHorizontal: 30 },
    info: { flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: 'rgba(135,169,107,0.1)', borderRadius: 10, marginBottom: 25 },
    infoText: { color: '#aaa', fontSize: 13, marginLeft: 10, flex: 1 },
    submitBtn: { backgroundColor: '#87a96b', padding: 16, borderRadius: 10, alignItems: 'center', marginBottom: 30 },
    disabledBtn: { backgroundColor: '#333', opacity: 0.7 },
    submitText: { color: '#000', fontSize: 16, fontWeight: 'bold' },
});
