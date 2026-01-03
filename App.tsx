import React from 'react';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from './src/hooks/useAuth';
import AuthScreen from './src/screens/AuthScreen';
import RankingScreen from './src/screens/RankingScreen';
import ChallengeScreen from './src/screens/ChallengeScreen';
import InboxScreen from './src/screens/InboxScreen';
import ScoreboardScreen from './src/screens/ScoreboardScreen';
import ActivityFeedScreen from './src/screens/ActivityFeedScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import { List, Bell, User, MessageSquare } from 'lucide-react-native';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
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
        name="Inbox"
        component={InboxScreen}
        options={{
          tabBarIcon: ({ color }) => <Bell color={color} size={24} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
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
      <Stack.Screen name="TheList" component={RankingScreen} />
      <Stack.Screen name="Challenge" component={ChallengeScreen} />
      <Stack.Screen name="Scoreboard" component={ScoreboardScreen} />
    </Stack.Navigator>
  );
}

function PlaceholderScreen() {
  return <View style={{ flex: 1, backgroundColor: '#0a0a0a' }} />;
}

export default function App() {
  const { session, loading } = useAuth();

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
