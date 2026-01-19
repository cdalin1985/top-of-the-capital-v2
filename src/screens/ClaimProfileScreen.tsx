import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, ActivityIndicator, Alert, Keyboard } from 'react-native';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';
import { UserCheck, Search, ChevronRight, UserPlus } from 'lucide-react-native';

export default function ClaimProfileScreen() {
    const [search, setSearch] = useState('');
    const [profiles, setProfiles] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(false);
    const [claiming, setClaiming] = useState<string | null>(null);

    async function searchProfiles() {
        const query = search.trim();
        if (!query) { Alert.alert('Search', 'Enter a name to search'); return; }
        Keyboard.dismiss();
        setLoading(true);
        try {
            const { data, error } = await supabase.from('users_profiles')
                .select('*').ilike('display_name', `%${query}%`).is('owner_id', null)
                .order('display_name', { ascending: true });
            if (error) throw error;
            setProfiles(data || []);
            if ((data || []).length === 0) {
                Alert.alert('No Results', `No unclaimed profiles found matching "${query}". You can create a new player profile.`);
            }
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    }

    async function claimProfile(profile: Profile) {
        Alert.alert('Claim Profile', `Are you ${profile.display_name}?\n\nRank #${profile.spot_rank} | Fargo ${profile.fargo_rating}`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Yes, Claim It', onPress: async () => {
                setClaiming(profile.id);
                try {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) throw new Error('Not authenticated');
                    const { error } = await supabase.from('users_profiles').update({ owner_id: user.id }).eq('id', profile.id);
                    if (error) throw error;
                    Alert.alert('Welcome Back!', `${profile.display_name}, your profile has been linked.`);
                } catch (error: any) {
                    Alert.alert('Error', error.message);
                } finally {
                    setClaiming(null);
                }
            }}
        ]);
    }

    async function createNewProfile() {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');
            const { data: maxRank } = await supabase.from('users_profiles').select('spot_rank').order('spot_rank', { ascending: false }).limit(1);
            const nextRank = (maxRank?.[0]?.spot_rank || 0) + 1;
            const displayName = search.trim() || user.user_metadata?.display_name || 'New Player';
            const { error } = await supabase.from('users_profiles').insert({
                owner_id: user.id, display_name: displayName, spot_rank: nextRank, fargo_rating: 400, points: 0
            });
            if (error) throw error;
            Alert.alert('Welcome!', `Your profile "${displayName}" has been created at Rank #${nextRank}.`);
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <UserCheck size={28} color="#87a96b" />
                <Text style={styles.title}>Claim Your Profile</Text>
            </View>
            <Text style={styles.desc}>Search for your name to link your existing Fargo rating and rank. Or create a new profile if you're new to the league.</Text>
            <View style={styles.searchRow}>
                <TextInput style={styles.input} placeholder="Search your name..." placeholderTextColor="#666"
                    value={search} onChangeText={setSearch} onSubmitEditing={searchProfiles} returnKeyType="search" />
                <TouchableOpacity style={styles.searchBtn} onPress={searchProfiles} accessibilityLabel="Search">
                    <Search size={20} color="#000" />
                </TouchableOpacity>
            </View>
            {loading ? <ActivityIndicator color="#87a96b" style={{ marginTop: 40 }} /> : (
                <FlatList data={profiles} keyExtractor={(item) => item.id} contentContainerStyle={styles.list}
                    renderItem={({ item }) => (
                        <TouchableOpacity style={styles.profileCard} onPress={() => claimProfile(item)} accessibilityLabel={`Claim ${item.display_name}`}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.profileName}>{item.display_name}</Text>
                                <Text style={styles.profileInfo}>Rank #{item.spot_rank} | Fargo {item.fargo_rating}</Text>
                            </View>
                            {claiming === item.id ? <ActivityIndicator color="#87a96b" size="small" /> : <ChevronRight color="#87a96b" size={20} />}
                        </TouchableOpacity>
                    )}
                    ListEmptyComponent={search.length > 0 ? (
                        <View style={styles.empty}>
                            <Text style={styles.emptyText}>No unclaimed profiles found</Text>
                            <TouchableOpacity style={styles.newBtn} onPress={createNewProfile}>
                                <UserPlus size={18} color="#000" />
                                <Text style={styles.newBtnText}>Create New Player Profile</Text>
                            </TouchableOpacity>
                        </View>
                    ) : null}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0a0a0a', padding: 20, paddingTop: 70 },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    title: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginLeft: 12 },
    desc: { color: '#888', fontSize: 14, lineHeight: 20, marginBottom: 24 },
    searchRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    input: { flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: 14, color: '#fff', fontSize: 15 },
    searchBtn: { backgroundColor: '#87a96b', borderRadius: 10, width: 52, justifyContent: 'center', alignItems: 'center' },
    list: { paddingBottom: 40 },
    profileCard: { flexDirection: 'row', alignItems: 'center', padding: 18, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    profileName: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
    profileInfo: { color: '#87a96b', fontSize: 12, marginTop: 3 },
    empty: { alignItems: 'center', marginTop: 40 },
    emptyText: { color: '#666', marginBottom: 20, fontSize: 14 },
    newBtn: { backgroundColor: '#87a96b', flexDirection: 'row', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 25, alignItems: 'center' },
    newBtnText: { color: '#000', fontWeight: 'bold', marginLeft: 8, fontSize: 14 },
});
