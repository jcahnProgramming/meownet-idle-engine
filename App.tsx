// ─────────────────────────────────────────────
//  MeowNet Idle Engine — App Entry Point
//  Auth gate → remote config → bottom tab navigation
// ─────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';

import { useAuth } from './src/hooks/useAuth';
import AuthScreen from './src/screens/AuthScreen';
import GameScreen from './src/screens/GameScreen';
import LeaderboardScreen from './src/screens/LeaderboardScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { gameConfig } from './src/config/gameConfig';
import { GameConfig } from './src/types/engine';
import { createDefaultState } from './src/engine/gameLoop';
import { loadRemoteConfig } from './src/engine/remoteConfig';

const Tab = createBottomTabNavigator();

function TabIcon({ icon, focused }: { icon: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.45 }}>{icon}</Text>
  );
}

function MainTabs({ userId, config }: { userId?: string; config: GameConfig }) {
  const theme = config.theme;
  const [gameState, setGameState] = useState(createDefaultState(config));

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
            <TabIcon icon={config.resources[0]?.icon ?? '🎮'} focused={focused} />
          ),
        }}
      >
        {() => <GameScreen userId={userId} config={config} />}
      </Tab.Screen>

      <Tab.Screen
        name="Leaderboard"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="🏆" focused={focused} />,
        }}
      >
        {() => <LeaderboardScreen config={config} />}
      </Tab.Screen>

      <Tab.Screen
        name="Settings"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="⚙️" focused={focused} />,
        }}
      >
        {() => (
          <SettingsScreen
            config={config}
            state={gameState}
            onReset={() => setGameState(createDefaultState(config))}
          />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export default function App() {
  const { user, loading } = useAuth();
  const [authed, setAuthed] = useState(false);
  const [activeConfig, setActiveConfig] = useState<GameConfig>(gameConfig);
  const [configLoaded, setConfigLoaded] = useState(false);

  // Load remote config overrides on startup
  useEffect(() => {
    loadRemoteConfig(gameConfig).then(merged => {
      setActiveConfig(merged);
      setConfigLoaded(true);
    });
  }, []);

  if (loading || !configLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: gameConfig.theme.backgroundColor, alignItems: 'center', justifyContent: 'center' }}>
        <StatusBar style="light" />
        <Text style={{ fontSize: 48 }}>{gameConfig.resources[0]?.icon ?? '🎮'}</Text>
        <ActivityIndicator color={gameConfig.theme.primaryColor} style={{ marginTop: 16 }} />
      </View>
    );
  }

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
        <MainTabs userId={user?.id} config={activeConfig} />
      </NavigationContainer>
    </>
  );
}
