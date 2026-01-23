import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { supabase } from '../lib/supabase';
import { useGuestStore } from '../store/useGuestStore';
import { Profile } from '../types';
import { formatCooldownRemaining, getInitials } from '../lib/utils';
import { LogOut, Settings, Award, Phone, Clock, Trophy, Target, Eye, UserPlus } from 'lucide-react-native';

export default function ProfileScreen({ navigation }: any) {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [stats, setStats] = useState({ wins: 0, losses: 0, challenges: 0 });

    const isGuest = useGuestStore((state) => state.isGuest);
    const clearGuest = useGuestStore((state) => state.clearGuest);

    async function fetchProfile(isRefresh = false) {
        if (isGuest) {
            setLoading(false);
            return;
        }
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not logged in');
            const { data, error } = await supabase.from('profiles').select('*').eq('owner_id', user.id).single();
            if (error) throw error;
            setProfile(data);
            // Fetch match stats
            if (data) {
                const { data: challenges } = await supabase.from('challenges')
                    .select('winner_id').or(`challenger_id.eq.${data.id},challenged_id.eq.${data.id}`).eq('status', 'completed');
                if (challenges) {
                    const wins = challenges.filter(c => c.winner_id === data.id).length;
                    const losses = challenges.length - wins;
                    setStats({ wins, losses, challenges: challenges.length });
                }
            }
        } catch (error: any) {
            console.error('Error:', error.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }

    useEffect(() => { fetchProfile(); }, [isGuest]);

    const handleLogout = () => {
        if (isGuest) {
            clearGuest();
            return;
        }
        Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign Out', style: 'destructive', onPress: async () => { await supabase.auth.signOut(); }}
        ]);
    };

    if (loading) {
        return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#87a96b" /></View>;
    }

    // Guest mode UI
    if (isGuest) {
        return (
            <View style={styles.container}>
                <View style={styles.guestHeader}>
                    <View style={styles.guestIconWrap}>
                        <Eye size={40} color="#666" />
                    </View>
                    <Text style={styles.guestTitle}>Guest Mode</Text>
                    <Text style={styles.guestSubtitle}>You're browsing as a guest</Text>
                </View>
                <View style={styles.guestCard}>
                    <Text style={styles.guestCardTitle}>Want to join the league?</Text>
                    <Text style={styles.guestCardText}>
                        Sign up to claim your spot on the ladder, challenge other players, and track your stats.
                    </Text>
                    <TouchableOpacity style={styles.guestSignUpBtn} onPress={handleLogout}>
                        <UserPlus size={18} color="#000" />
                        <Text style={styles.guestSignUpText}>Sign Up / Sign In</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    if (!profile) {
        return <View style={styles.loadingContainer}><Text style={styles.errorText}>Profile not found</Text></View>;
    }
    const hasCooldown = profile.cooldown_until && new Date(profile.cooldown_until) > new Date();

    return (
        <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchProfile(true)} tintColor="#87a96b" />}>
            <View style={styles.header}>
                <View style={styles.avatarWrap}>
                    {profile.avatar_url ? <Image source={{ uri: profile.avatar_url }} style={styles.avatar} /> : (
                        <View style={[styles.avatar, styles.placeholderAvatar]}>
                            <Text style={styles.avatarInitial}>{getInitials(profile.full_name)}</Text>
                        </View>
                    )}
                </View>
                <Text style={styles.name}>{profile.full_name}</Text>
                <Text style={styles.rank}>RANK #{profile.ladder_rank}</Text>
                {hasCooldown && (
                    <View style={styles.cooldownBadge}>
                        <Clock size={12} color="#ff9800" />
                        <Text style={styles.cooldownText}>{formatCooldownRemaining(profile.cooldown_until!)}</Text>
                    </View>
                )}
            </View>
            <View style={styles.statsGrid}>
                <View style={styles.statBox}>
                    <Trophy size={20} color="#ffd700" />
                    <Text style={styles.statNum}>{stats.wins}</Text>
                    <Text style={styles.statLabel}>Wins</Text>
                </View>
                <View style={styles.statBox}>
                    <Target size={20} color="#f44336" />
                    <Text style={styles.statNum}>{stats.losses}</Text>
                    <Text style={styles.statLabel}>Losses</Text>
                </View>
                <View style={styles.statBox}>
                    <Award size={20} color="#87a96b" />
                    <Text style={styles.statNum}>{profile.fargo_rating}</Text>
                    <Text style={styles.statLabel}>Fargo</Text>
                </View>
            </View>
            <View style={styles.pointsCard}>
                <Text style={styles.pointsValue}>{profile.points}</Text>
                <Text style={styles.pointsLabel}>ENGAGEMENT POINTS</Text>
                <Text style={styles.pointsSub}>+2 Challenge | +1 Play | +3 Win</Text>
            </View>
            <View style={styles.section}>
                <View style={styles.menuItem}>
                    <Phone size={18} color="#87a96b" />
                    <Text style={styles.menuText}>{profile.phone || 'No phone linked'}</Text>
                </View>
                <TouchableOpacity style={styles.menuItem}>
                    <Settings size={18} color="#666" />
                    <Text style={[styles.menuText, { color: '#666' }]}>Account Settings</Text>
                </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                <LogOut size={18} color="#ff5252" />
                <Text style={styles.logoutText}>Sign Out</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0a0a0a' },
    loadingContainer: { flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center' },
    errorText: { color: '#666', fontSize: 16 },
    header: { paddingTop: 70, paddingBottom: 30, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)' },
    avatarWrap: { width: 110, height: 110, borderRadius: 55, borderWidth: 3, borderColor: '#87a96b', padding: 3, marginBottom: 16 },
    avatar: { width: '100%', height: '100%', borderRadius: 52 },
    placeholderAvatar: { backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center' },
    avatarInitial: { color: '#87a96b', fontSize: 36, fontWeight: 'bold' },
    name: { color: '#fff', fontSize: 26, fontWeight: 'bold' },
    rank: { color: '#87a96b', fontSize: 13, fontWeight: 'bold', marginTop: 4, letterSpacing: 2 },
    cooldownBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 10, backgroundColor: 'rgba(255,152,0,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15 },
    cooldownText: { color: '#ff9800', fontSize: 12, fontWeight: '600', marginLeft: 6 },
    statsGrid: { flexDirection: 'row', justifyContent: 'space-around', padding: 20 },
    statBox: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', paddingVertical: 16, paddingHorizontal: 24, borderRadius: 12 },
    statNum: { color: '#fff', fontSize: 28, fontWeight: 'bold', marginTop: 8 },
    statLabel: { color: '#666', fontSize: 11, marginTop: 2 },
    pointsCard: { margin: 20, marginTop: 0, backgroundColor: 'rgba(135,169,107,0.1)', borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(135,169,107,0.2)' },
    pointsValue: { color: '#fff', fontSize: 42, fontWeight: 'bold' },
    pointsLabel: { color: '#87a96b', fontSize: 11, fontWeight: 'bold', marginTop: 4, letterSpacing: 1 },
    pointsSub: { color: '#666', fontSize: 10, marginTop: 6 },
    section: { paddingHorizontal: 20 },
    menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    menuText: { color: '#fff', fontSize: 15, marginLeft: 14 },
    logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 20, marginTop: 20, marginBottom: 50 },
    logoutText: { color: '#ff5252', fontSize: 15, fontWeight: 'bold', marginLeft: 8 },
    // Guest mode styles
    guestHeader: { paddingTop: 100, paddingBottom: 40, alignItems: 'center' },
    guestIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    guestTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
    guestSubtitle: { color: '#666', fontSize: 14, marginTop: 6 },
    guestCard: { margin: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    guestCardTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
    guestCardText: { color: '#888', fontSize: 14, lineHeight: 22, marginBottom: 20 },
    guestSignUpBtn: { backgroundColor: '#87a96b', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12 },
    guestSignUpText: { color: '#000', fontSize: 15, fontWeight: 'bold', marginLeft: 8 },
});
