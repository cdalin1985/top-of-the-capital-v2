import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from './src/hooks/useAuth';
import { useNotificationStore } from './src/store/useNotificationStore';
import { registerForPushNotificationsAsync } from './src/lib/notifications';
import { supabase } from './src/lib/supabase';
import AuthScreen from './src/screens/AuthScreen';
import RankingScreen from './src/screens/RankingScreen';
import ChallengeScreen from './src/screens/ChallengeScreen';
import InboxScreen from './src/screens/InboxScreen';
import ScoreboardScreen from './src/screens/ScoreboardScreen';
import ActivityFeedScreen from './src/screens/ActivityFeedScreen';
import StreamingScreen from './src/screens/StreamingScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import { List, Bell, User, MessageSquare, Video } from 'lucide-react-native';

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
        name="Rankings"
        component={RankingStack}
        options={{
          tabBarIcon: ({ color }) => <List color={color} size={24} {...({ color } as any)} />,
        }}
      />
      <Tab.Screen
        name="Feed"
        component={ActivityFeedScreen}
        options={{
          tabBarIcon: ({ color }) => <MessageSquare color={color} size={24} {...({ color } as any)} />,
        }}
      />
      <Tab.Screen
        name="Arena"
        component={StreamingScreen}
        options={{
          tabBarIcon: ({ color }) => <Video color={color} size={24} {...({ color } as any)} />,
        }}
      />
      <Tab.Screen
        name="Inbox"
        component={InboxScreen}
        options={{
          tabBarIcon: ({ color }) => <Bell color={color} size={24} {...({ color } as any)} />,
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: { backgroundColor: '#f44336' },
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color }) => <User color={color} size={24} {...({ color } as any)} />,
        }}
      />
    </Tab.Navigator>
  );
}

function RankingStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="TheList" component={RankingScreen} />
      <Stack.Screen name="Challenge" component={ChallengeScreen} />
      <Stack.Screen name="Scoreboard" component={ScoreboardScreen} />
    </Stack.Navigator>
  );
}

export default function App() {
  const { session, loading } = useAuth();
  const fetchUnreadCount = useNotificationStore((state) => state.fetchUnreadCount);

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
            .from('users_profiles')
            .update({ expo_push_token: token })
            .eq('id', session.user.id)
            .then(({ error }) => {
              if (error) console.error('Error saving push token:', error);
            });
        }
      });

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [session, fetchUnreadCount]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#87a96b" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {session ? (
          <Stack.Screen name="Main" component={MainTabs} />
        ) : (
          <Stack.Screen name="Auth" component={AuthScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
  },
});
