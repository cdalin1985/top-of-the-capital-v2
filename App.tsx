import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from './src/hooks/useAuth';
import { useNetworkStatus } from './src/hooks/useNetworkStatus';
import { useNotificationStore } from './src/store/useNotificationStore';
import { useGuestStore } from './src/store/useGuestStore';
import { registerForPushNotificationsAsync } from './src/lib/notifications';
import { supabase } from './src/lib/supabase';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { OfflineBanner } from './src/components/OfflineBanner';
import AuthScreen from './src/screens/AuthScreen';
import RankingScreen from './src/screens/RankingScreen';
import LeaderboardScreen from './src/screens/LeaderboardScreen';
import ChallengeScreen from './src/screens/ChallengeScreen';
import InboxScreen from './src/screens/InboxScreen';
import ScoreboardScreen from './src/screens/ScoreboardScreen';
import ActivityFeedScreen from './src/screens/ActivityFeedScreen';
import StreamingScreen from './src/screens/StreamingScreen';
import ClaimProfileScreen from './src/screens/ClaimProfileScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import HomeScreen from './src/screens/HomeScreen';
import MatchHistoryScreen from './src/screens/MatchHistoryScreen';
import { Home, List, Bell, User, MessageSquare, Video } from 'lucide-react-native';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  const unreadCount = useNotificationStore((state) => state.unreadCount);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0a0a0a',
          borderTopColor: 'rgba(255,255,255,0.1)',
          paddingBottom: Platform.OS === 'ios' ? 25 : 5,
          height: Platform.OS === 'ios' ? 85 : 60,
        },
        tabBarActiveTintColor: '#87a96b',
        tabBarInactiveTintColor: '#666',
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color }) => <Home color={color} size={24} />,
        }}
      />
      <Tab.Screen
        name="Rankings"
        component={RankingStack}
        options={{
          tabBarIcon: ({ color }) => <List color={color} size={24} />,
        }}
      />
      <Tab.Screen
        name="Feed"
        component={ActivityFeedScreen}
        options={{
          tabBarIcon: ({ color }) => <MessageSquare color={color} size={24} />,
        }}
      />
      <Tab.Screen
        name="Arena"
        component={StreamingScreen}
        options={{
          tabBarIcon: ({ color }) => <Video color={color} size={24} />,
        }}
      />
      <Tab.Screen
        name="Inbox"
        component={InboxScreen}
        options={{
          tabBarIcon: ({ color }) => <Bell color={color} size={24} />,
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: { backgroundColor: '#f44336' },
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={{
          tabBarIcon: ({ color }) => <User color={color} size={24} />,
        }}
      />
    </Tab.Navigator>
  );
}

function RankingStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="TheList" component={LeaderboardScreen} />
      <Stack.Screen name="Challenge" component={ChallengeScreen} />
      <Stack.Screen name="Scoreboard" component={ScoreboardScreen} />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileMain" component={ProfileScreen} />
      <Stack.Screen name="MatchHistory" component={MatchHistoryScreen} />
    </Stack.Navigator>
  );
}

function AppContent() {
  const { session, loading } = useAuth();
  const { isConnected } = useNetworkStatus();
  const [hasProfile, setHasProfile] = React.useState<boolean | null>(null);
  const fetchUnreadCount = useNotificationStore((state) => state.fetchUnreadCount);
  const isGuest = useGuestStore((state) => state.isGuest);

  const checkProfile = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('owner_id', userId)
        .single();
      setHasProfile(!!data);
    } catch {
      setHasProfile(false);
    }
  };

  useEffect(() => {
    if (session?.user) {
      // 1. Initial Load
      fetchUnreadCount(session.user.id);

      // 2. Real-time Subscription
      const channel = supabase
        .channel('db-notifications')
        .on(
          'postgres_changes' as any,
          {
            event: '*',
            table: 'challenges',
            filter: `challenged_id=eq.${session.user.id}`,
          },
          () => fetchUnreadCount(session.user.id)
        )
        .subscribe();

      // 3. Push Token Registration
      registerForPushNotificationsAsync().then(token => {
        if (token) {
          supabase
            .from('profiles')
            .update({ expo_push_token: token })
            .eq('owner_id', session.user.id);
        }
      });

      // 4. Check Profile Status
      checkProfile(session.user.id);
      const profileChannel = supabase
        .channel('profile-check')
        .on(
          'postgres_changes' as any,
          {
            event: '*',
            table: 'profiles',
            filter: `owner_id=eq.${session.user.id}`,
          },
          () => setHasProfile(true)
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
        supabase.removeChannel(profileChannel);
      };
    } else {
      setHasProfile(null);
    }
  }, [session, fetchUnreadCount]);

  if (loading || (session && hasProfile === null)) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#87a96b" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!isConnected && <OfflineBanner />}
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!session && !isGuest ? (
            <Stack.Screen name="Auth" component={AuthScreen} />
          ) : isGuest ? (
            <Stack.Screen name="Main" component={MainTabs} />
          ) : !hasProfile && hasProfile !== null ? (
            <Stack.Screen name="Claim" component={ClaimProfileScreen} />
          ) : (
            <Stack.Screen name="Main" component={MainTabs} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </View>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
  },
});
