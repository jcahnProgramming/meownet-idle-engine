// ─────────────────────────────────────────────
//  MeowNet Idle Engine — App Entry Point
//  Auth gate → bottom tab navigation
// ─────────────────────────────────────────────

import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

import { useAuth } from './src/hooks/useAuth';
import AuthScreen from './src/screens/AuthScreen';
import GameScreen from './src/screens/GameScreen';
import LeaderboardScreen from './src/screens/LeaderboardScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { gameConfig } from './src/config/gameConfig';
import { createDefaultState } from './src/engine/gameLoop';

const theme = gameConfig.theme;
const Tab = createBottomTabNavigator();

function TabIcon({ icon, focused }: { icon: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.45 }}>{icon}</Text>
  );
}

function MainTabs({ userId }: { userId?: string }) {
  const [gameState, setGameState] = useState(createDefaultState(gameConfig));

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.surfaceColor,
          borderTopColor: 'rgba(255,255,255,0.06)',
          borderTopWidth: 1,
          paddingBottom: 4,
          height: 60,
        },
        tabBarActiveTintColor: theme.primaryColor,
        tabBarInactiveTintColor: 'rgba(255,255,255,0.35)',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Game"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={gameConfig.resources[0]?.icon ?? '🎮'} focused={focused} />
          ),
        }}
      >
        {() => <GameScreen userId={userId} />}
      </Tab.Screen>

      <Tab.Screen
        name="Leaderboard"
        component={LeaderboardScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="🏆" focused={focused} />,
        }}
      />

      <Tab.Screen
        name="Settings"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="⚙️" focused={focused} />,
        }}
      >
        {() => (
          <SettingsScreen
            state={gameState}
            onReset={() => setGameState(createDefaultState(gameConfig))}
          />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export default function App() {
  const { user, loading } = useAuth();
  const [authed, setAuthed] = useState(false);

  if (loading) return null;

  if (!user && !authed) {
    return (
      <>
        <StatusBar style="light" />
        <AuthScreen onAuthenticated={() => setAuthed(true)} />
      </>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <NavigationContainer>
        <MainTabs userId={user?.id} />
      </NavigationContainer>
    </>
  );
}
