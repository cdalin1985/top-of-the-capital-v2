import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function SkeletonLoader({ 
  width = '100%', 
  height = 20, 
  borderRadius = 4,
  style = {} 
}: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.6,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width, height, borderRadius, opacity },
        style,
      ]}
    />
  );
}

export function SkeletonCard() {
  return (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <SkeletonLoader width={50} height={50} borderRadius={25} />
        <View style={styles.cardContent}>
          <SkeletonLoader width="60%" height={18} style={{ marginBottom: 8 }} />
          <SkeletonLoader width="40%" height={14} />
        </View>
      </View>
    </View>
  );
}

export function SkeletonRankingItem() {
  return (
    <View style={styles.rankingItem}>
      <SkeletonLoader width={40} height={40} borderRadius={20} />
      <View style={styles.rankingContent}>
        <SkeletonLoader width="50%" height={16} style={{ marginBottom: 6 }} />
        <SkeletonLoader width="30%" height={12} />
      </View>
      <SkeletonLoader width={40} height={40} borderRadius={10} />
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#333',
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 15,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
    marginLeft: 12,
  },
  rankingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    marginHorizontal: 15,
  },
  rankingContent: {
    flex: 1,
    marginLeft: 15,
  },
});
