import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Video } from 'lucide-react-native';

export default function StreamingScreen() {
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Video color="#87a96b" size={32} />
                <Text style={styles.title}>LIVE ARENA</Text>
            </View>

            <View style={styles.streamPlaceholder}>
                <View style={styles.videoMock}>
                    <Text style={styles.placeholderText}>NO ACTIVE STREAMS</Text>
                    <Text style={styles.subtitle}>Streaming requires an active match with broadacst enabled.</Text>
                </View>

                <TouchableOpacity style={styles.startBtn}>
                    <Text style={styles.startBtnText}>START BROADCAST</Text>
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
    streamPlaceholder: {
        flex: 1,
        padding: 20,
        justifyContent: 'center',
    },
    videoMock: {
        aspectRatio: 16 / 9,
        backgroundColor: '#111',
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        marginBottom: 30,
    },
    placeholderText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    subtitle: {
        color: '#666',
        textAlign: 'center',
        marginTop: 10,
        paddingHorizontal: 40,
    },
    startBtn: {
        backgroundColor: '#87a96b',
        padding: 20,
        borderRadius: 15,
        alignItems: 'center',
    },
    startBtnText: {
        color: '#000',
        fontWeight: 'bold',
        fontSize: 16,
    }
});
