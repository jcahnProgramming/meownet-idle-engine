// ─────────────────────────────────────────────
//  MeowNet Idle Engine — Settings Screen
// ─────────────────────────────────────────────

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { gameConfig as defaultConfig } from '../config/gameConfig';
import { GameConfig, GameState } from '../types/engine';
import { useAuth } from '../hooks/useAuth';
import { clearLocal } from '../engine/saveManager';
import { formatNumber } from '../engine/gameLoop';

interface Props {
  config?: GameConfig;
  state: GameState;
  muted?: boolean;
  onToggleMute?: () => void;
  notificationsEnabled?: boolean;
  onToggleNotifications?: () => void;
  onReset: () => void;
}

export default function SettingsScreen({ config: configProp, state, muted, onToggleMute, notificationsEnabled, onToggleNotifications, onReset }: Props) {
  const gameConfig = configProp ?? defaultConfig;
  const theme = gameConfig.theme;
  const { user, username, signOut } = useAuth();

  const handleReset = () => {
    Alert.alert(
      'Reset Save',
      'This will delete all local progress. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            clearLocal(gameConfig);
            onReset();
          },
        },
      ]
    );
  };

  const playtimeHours = Math.floor(state.totalPlaytimeMs / 3600000);
  const playtimeMins = Math.floor((state.totalPlaytimeMs % 3600000) / 60000);

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>

        {/* Game header */}
        <View style={styles.section}>
          <Text style={styles.gameIcon}>{gameConfig.resources[0]?.icon}</Text>
          <Text style={styles.gameName}>{gameConfig.gameName}</Text>
          <Text style={styles.version}>v{gameConfig.version} · MeowNet Idle Engine</Text>
        </View>

        {/* Account */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Account</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Username</Text>
            <Text style={styles.rowValue}>{username}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Email</Text>
            <Text style={styles.rowValue}>{user?.email ?? 'Guest'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Save sync</Text>
            <Text style={styles.rowValue}>{user?.email ? '☁️ Cloud' : '📱 Local only'}</Text>
          </View>
          {onToggleMute && (
            <TouchableOpacity style={styles.row} onPress={onToggleMute}>
              <Text style={styles.rowLabel}>Sound</Text>
              <Text style={styles.rowValue}>{muted ? '🔇 Muted' : '🔊 On'}</Text>
            </TouchableOpacity>
          )}
          {onToggleNotifications && (
            <TouchableOpacity style={styles.row} onPress={onToggleNotifications}>
              <Text style={styles.rowLabel}>Notifications</Text>
              <Text style={styles.rowValue}>{notificationsEnabled ? '🔔 On' : '🔕 Off'}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Stats */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Stats</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Playtime</Text>
            <Text style={styles.rowValue}>{playtimeHours}h {playtimeMins}m</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Prestiges</Text>
            <Text style={styles.rowValue}>{state.prestige.totalPrestiges}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>{gameConfig.prestige.currencyName}</Text>
            <Text style={styles.rowValue}>
              {gameConfig.prestige.currencyIcon} {formatNumber(state.prestige.currency)}
            </Text>
          </View>
          {gameConfig.resources.map(r => (
            <View key={r.id} style={styles.row}>
              <Text style={styles.rowLabel}>{r.icon} {r.name}</Text>
              <Text style={styles.rowValue}>{formatNumber(state.resources[r.id] ?? 0)}</Text>
            </View>
          ))}
        </View>

        {/* Prestige info */}
        {gameConfig.prestige.enabled && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Prestige</Text>
            <Text style={styles.infoText}>
              Reset your run when you have {formatNumber(gameConfig.prestige.requiredAmount)}{' '}
              {gameConfig.resources.find(r => r.id === gameConfig.prestige.requiredResource)?.icon ?? ''}{' '}
              to earn {gameConfig.prestige.currencyIcon} {gameConfig.prestige.currencyName}.
              {gameConfig.prestige.persistedUpgrades?.length
                ? ` The following upgrades survive prestige: ${
                    gameConfig.prestige.persistedUpgrades
                      .map(id => gameConfig.upgrades.find(u => u.id === id)?.name)
                      .join(', ')
                  }.`
                : ''}
            </Text>
          </View>
        )}

        {/* Danger zone */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Danger Zone</Text>
          <TouchableOpacity style={styles.dangerButton} onPress={handleReset}>
            <Text style={styles.dangerButtonText}>Reset Save Data</Text>
          </TouchableOpacity>
          {user?.email && (
            <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
              <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const defaultTheme = defaultConfig.theme;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: defaultTheme.backgroundColor },
  content: { padding: 16, gap: 12 },
  section: { alignItems: 'center', paddingVertical: 16 },
  gameIcon: { fontSize: 52 },
  gameName: { fontSize: 22, fontWeight: '800', color: defaultTheme.textColor, marginTop: 8 },
  version: { fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 4 },
  card: {
    backgroundColor: defaultTheme.surfaceColor,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    gap: 2,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.35)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  rowLabel: { fontSize: 14, color: 'rgba(255,255,255,0.55)' },
  rowValue: { fontSize: 14, fontWeight: '600', color: defaultTheme.textColor },
  infoText: { fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 20 },
  dangerButton: {
    marginTop: 8, height: 44, borderRadius: 10,
    backgroundColor: 'rgba(220,50,50,0.15)', borderWidth: 1,
    borderColor: 'rgba(220,50,50,0.35)', alignItems: 'center', justifyContent: 'center',
  },
  dangerButtonText: { color: '#E05050', fontWeight: '700', fontSize: 14 },
  signOutButton: {
    marginTop: 8, height: 44, borderRadius: 10, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center',
  },
  signOutText: { color: 'rgba(255,255,255,0.45)', fontWeight: '600', fontSize: 14 },
});
