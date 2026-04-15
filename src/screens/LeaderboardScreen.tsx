// ─────────────────────────────────────────────
//  MeowNet Idle Engine — Leaderboard Screen
// ─────────────────────────────────────────────

import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  ActivityIndicator, TouchableOpacity, SafeAreaView,
} from 'react-native';
import { gameConfig as defaultConfig } from '../config/gameConfig';
import { GameConfig } from '../types/engine';
import { getLeaderboard } from '../engine/saveManager';
import { formatNumber } from '../engine/gameLoop';

interface Entry { username: string; score: number }
const MEDALS = ['🥇', '🥈', '🥉'];

interface Props { config?: GameConfig }

export default function LeaderboardScreen({ config: configProp }: Props) {
  const gameConfig = configProp ?? defaultConfig;
  const theme = gameConfig.theme;

  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const data = await getLeaderboard(gameConfig);
    setEntries(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.backgroundColor },
    header: { padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.07)', alignItems: 'center' },
    title: { fontSize: 24, fontWeight: '800', color: theme.textColor },
    subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
    refreshButton: { marginTop: 10, padding: 6 },
    refreshText: { color: theme.accentColor, fontSize: 13 },
    list: { padding: 16, gap: 8 },
    empty: { color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: 60, fontSize: 15 },
    row: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.surfaceColor, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
    rowFirst: { borderColor: theme.accentColor, borderWidth: 1 },
    rank: { fontSize: 20, width: 44 },
    username: { flex: 1, fontSize: 15, fontWeight: '600', color: theme.textColor },
    score: { fontSize: 14, fontWeight: '700', color: theme.accentColor },
  });

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Leaderboard</Text>
        <Text style={styles.subtitle}>{gameConfig.gameName}</Text>
        <TouchableOpacity onPress={load} style={styles.refreshButton}>
          <Text style={styles.refreshText}>↻ Refresh</Text>
        </TouchableOpacity>
      </View>
      {loading ? (
        <ActivityIndicator color={theme.primaryColor} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>No scores yet. Be the first!</Text>}
          renderItem={({ item, index }) => (
            <View style={[styles.row, index === 0 && styles.rowFirst]}>
              <Text style={styles.rank}>{index < 3 ? MEDALS[index] : `#${index + 1}`}</Text>
              <Text style={styles.username}>{item.username}</Text>
              <Text style={styles.score}>{gameConfig.resources[0]?.icon} {formatNumber(item.score)}</Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}
