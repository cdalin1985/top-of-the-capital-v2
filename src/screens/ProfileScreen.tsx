import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';
import { LogOut, Settings, Award, Phone } from 'lucide-react-native';

export default function ProfileScreen() {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    async function fetchProfile() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('users_profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (error) throw error;
            setProfile(data);
        } catch (error: any) {
            console.error('Error fetching profile:', error.message);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchProfile();
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    if (!profile) return null;

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.avatarContainer}>
                    {profile.avatar_url ? (
                        <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
                    ) : (
                        <View style={[styles.avatar, styles.placeholderAvatar]}>
                            <Text style={styles.avatarInitial}>{profile.display_name.charAt(0)}</Text>
                        </View>
                    )}
                </View>
                <Text style={styles.name}>{profile.display_name}</Text>
                <Text style={styles.rank}>RANK #{profile.spot_rank}</Text>
            </View>

            <View style={styles.statsRow}>
                <View style={styles.statCard}>
                    <Text style={styles.statValue}>{profile.points}</Text>
                    <Text style={styles.statLabel}>ENGAGEMENT POINTS</Text>
                    <Text style={styles.statSublabel}>2 (Chall) • 1 (Play) • 3 (Win)</Text>
                </View>
            </View>

            <View style={styles.section}>
                <View style={styles.menuItem}>
                    <Phone size={20} color="#87a96b" />
                    <Text style={styles.menuText}>{profile.phone || 'No phone verified'}</Text>
                </View>
                <View style={styles.menuItem}>
                    <Award size={20} color="#87a96b" />
                    <Text style={styles.menuText}>Fargo Rating: {profile.fargo_rating}</Text>
                </View>
                <TouchableOpacity style={styles.menuItem}>
                    <Settings size={20} color="#666" />
                    <Text style={[styles.menuText, { color: '#666' }]}>Account Settings</Text>
                </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                <LogOut size={20} color="#ff5252" />
                <Text style={styles.logoutText}>Sign Out</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a0a',
    },
    header: {
        paddingTop: 80,
        paddingBottom: 40,
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
    },
    avatarContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 3,
        borderColor: '#87a96b',
        padding: 3,
        marginBottom: 20,
    },
    avatar: {
        width: '100%',
        height: '100%',
        borderRadius: 55,
    },
    placeholderAvatar: {
        backgroundColor: '#333',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarInitial: {
        color: '#87a96b',
        fontSize: 40,
        fontWeight: 'bold',
    },
    name: {
        color: '#fff',
        fontSize: 28,
        fontWeight: 'bold',
        fontFamily: Platform.OS === 'ios' ? 'Cinzel Decorative' : 'serif',
    },
    rank: {
        color: '#87a96b',
        fontSize: 14,
        fontWeight: 'bold',
        marginTop: 5,
        letterSpacing: 2,
    },
    statsRow: {
        padding: 20,
    },
    statCard: {
        backgroundColor: 'rgba(135, 169, 107, 0.1)',
        borderRadius: 20,
        padding: 25,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(135, 169, 107, 0.2)',
    },
    statValue: {
        color: '#fff',
        fontSize: 48,
        fontWeight: 'bold',
    },
    statLabel: {
        color: '#87a96b',
        fontSize: 12,
        fontWeight: 'bold',
        marginTop: 5,
    },
    statSublabel: {
        color: '#666',
        fontSize: 10,
        marginTop: 5,
    },
    section: {
        padding: 20,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 18,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    menuText: {
        color: '#fff',
        fontSize: 16,
        marginLeft: 15,
    },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 25,
        marginTop: 20,
        marginBottom: 50,
    },
    logoutText: {
        color: '#ff5252',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 10,
    },
});
