// ─────────────────────────────────────────────
//  MeowNet Idle Engine — App Entry Point
// ─────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { useAuth } from './src/hooks/useAuth';
import { useGameEngine } from './src/hooks/useGameEngine';
import { useSoundEngine } from './src/hooks/useSoundEngine';
import { useAnalytics } from './src/hooks/useAnalytics';
import { useNotifications } from './src/hooks/useNotifications';
import AuthScreen from './src/screens/AuthScreen';
import GameScreen from './src/screens/GameScreen';
import LeaderboardScreen from './src/screens/LeaderboardScreen';
import PrestigeShopScreen from './src/screens/PrestigeShopScreen';
import DailyChallengesScreen from './src/screens/DailyChallengesScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { gameConfig as defaultGameConfig } from './src/config/gameConfig';
import { GameConfig } from './src/types/engine';
import { loadRemoteConfig } from './src/engine/remoteConfig';

const Tab = createBottomTabNavigator();

function TabIcon({ icon, focused }: { icon: string; focused: boolean }) {
  return <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.45 }}>{icon}</Text>;
}

function MainTabs({ userId, config }: { userId?: string; config: GameConfig }) {
  const theme = config.theme;
  const engine = useGameEngine({ config, userId });
  const sound = useSoundEngine(config);
  const { track } = useAnalytics({ config, userId, state: engine.state });
  useNotifications({ config, state: engine.state });
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Wire sound + analytics to engine events
  useEffect(() => {
    if (engine.pendingAchievement) sound.play('achievement');
  }, [engine.pendingAchievement?.id]);

  useEffect(() => {
    if (engine.pendingMilestone) {
      sound.play('milestone');
      track('milestone_reached', { milestone_id: engine.pendingMilestone.id });
    }
  }, [engine.pendingMilestone?.id]);

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
        options={{ tabBarIcon: ({ focused }) => <TabIcon icon={config.resources[0]?.icon ?? '🎮'} focused={focused} /> }}
      >
        {() => <GameScreen engine={engine} config={config} sound={sound} />}
      </Tab.Screen>

      <Tab.Screen
        name="Shop"
        options={{ tabBarIcon: ({ focused }) => <TabIcon icon={config.prestige.currencyIcon} focused={focused} /> }}
      >
        {() => (
          <PrestigeShopScreen
            config={config}
            state={engine.state}
            onBuy={(id) => {
              engine.purchasePrestigeUpgrade(id);
              sound.play('upgrade');
            }}
          />
        )}
      </Tab.Screen>

      <Tab.Screen
        name="Daily"
        options={{ tabBarIcon: ({ focused }) => <TabIcon icon="📅" focused={focused} /> }}
      >
        {() => (
          <DailyChallengesScreen
            config={config}
            state={engine.state}
            onClaim={(id) => {
              engine.claimChallenge(id);
              sound.play('achievement');
            }}
          />
        )}
      </Tab.Screen>

      <Tab.Screen
        name="Leaderboard"
        options={{ tabBarIcon: ({ focused }) => <TabIcon icon="🏆" focused={focused} /> }}
      >
        {() => <LeaderboardScreen config={config} />}
      </Tab.Screen>

      <Tab.Screen
        name="Settings"
        options={{ tabBarIcon: ({ focused }) => <TabIcon icon="⚙️" focused={focused} /> }}
      >
        {() => (
          <SettingsScreen
            config={config}
            state={engine.state}
            muted={sound.muted}
            onToggleMute={sound.toggleMute}
            notificationsEnabled={notificationsEnabled}
            onToggleNotifications={() => setNotificationsEnabled(n => !n)}
            onReset={() => {}}
          />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export default function App() {
  const { user, loading } = useAuth();
  const [authed, setAuthed] = useState(false);
  const [activeConfig, setActiveConfig] = useState<GameConfig>(defaultGameConfig);
  const [configLoaded, setConfigLoaded] = useState(false);

  useEffect(() => {
    loadRemoteConfig(defaultGameConfig).then(merged => {
      setActiveConfig(merged);
      setConfigLoaded(true);
    });
  }, []);

  if (loading || !configLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: defaultGameConfig.theme.backgroundColor, alignItems: 'center', justifyContent: 'center' }}>
        <StatusBar style="light" />
        <Text style={{ fontSize: 52 }}>{defaultGameConfig.resources[0]?.icon ?? '🎮'}</Text>
        <ActivityIndicator color={defaultGameConfig.theme.primaryColor} style={{ marginTop: 16 }} />
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
