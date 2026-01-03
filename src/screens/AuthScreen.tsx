import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { supabase } from '../lib/supabase';

export default function AuthScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);

    async function handleAuth() {
        setLoading(true);
        try {
            if (isSignUp) {
                // Register user with phone and metadata
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            display_name: displayName,
                            phone: phone,
                        },
                    },
                });
                if (error) throw error;
                Alert.alert('Success', 'Check your email for the confirmation link!');
            } else {
                // Login
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
            }
        } catch (error: any) {
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.card}>
                    <Text style={styles.title}>{isSignUp ? 'Join the League' : 'Welcome Back'}</Text>

                    {isSignUp && (
                        <>
                            <TextInput
                                style={styles.input}
                                placeholder="Display Name"
                                placeholderTextColor="#666"
                                value={displayName}
                                onChangeText={setDisplayName}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="Phone Number"
                                placeholderTextColor="#666"
                                keyboardType="phone-pad"
                                value={phone}
                                onChangeText={setPhone}
                            />
                        </>
                    )}

                    <TextInput
                        style={styles.input}
                        placeholder="Email"
                        placeholderTextColor="#666"
                        autoCapitalize="none"
                        keyboardType="email-address"
                        value={email}
                        onChangeText={setEmail}
                    />

                    <TextInput
                        style={styles.input}
                        placeholder="Password"
                        placeholderTextColor="#666"
                        secureTextEntry
                        value={password}
                        onChangeText={setPassword}
                    />

                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleAuth}
                        disabled={loading}
                    >
                        <Text style={styles.buttonText}>{loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Sign In')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
                        <Text style={styles.switchText}>
                            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Join Now"}
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a0a',
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 20,
    },
    card: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 20,
        padding: 30,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 30,
        textAlign: 'center',
        fontFamily: Platform.OS === 'ios' ? 'Cinzel Decorative' : 'serif',
    },
    input: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 12,
        padding: 15,
        marginBottom: 15,
        color: '#fff',
        fontSize: 16,
    },
    button: {
        backgroundColor: '#87a96b',
        borderRadius: 12,
        padding: 18,
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 20,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    buttonText: {
        color: '#000',
        fontSize: 18,
        fontWeight: 'bold',
    },
    switchText: {
        color: '#87a96b',
        textAlign: 'center',
        fontSize: 14,
    },
});
