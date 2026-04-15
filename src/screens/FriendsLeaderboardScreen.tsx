// ─────────────────────────────────────────────
//  MeowNet Idle Engine — Friends Leaderboard
//  Shows leaderboard filtered to friends only.
//  Add friends by user ID (share your ID to play).
// ─────────────────────────────────────────────

import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, SafeAreaView,
  TouchableOpacity, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { createClient } from '@supabase/supabase-js';
import { gameConfig as defaultConfig } from '../config/gameConfig';
import { GameConfig } from '../types/engine';
import { formatNumber } from '../engine/gameLoop';

const defaultTheme = defaultConfig.theme;
const MEDALS = ['🥇', '🥈', '🥉'];

interface FriendScore { username: string; score: number; userId: string }

function getClient(config: GameConfig) {
  return createClient(config.remote.supabaseUrl, config.remote.supabaseAnonKey);
}

interface Props { config?: GameConfig; userId?: string }

export default function FriendsLeaderboardScreen({ config: configProp, userId }: Props) {
  const config = configProp ?? defaultConfig;
  const [scores, setScores] = useState<FriendScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingFriend, setAddingFriend] = useState(false);
  const [friendInput, setFriendInput] = useState('');
  const [myId, setMyId] = useState(userId ?? '');

  const loadScores = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const client = getClient(config);

      // Get friend IDs
      const { data: friends } = await (client.from('idle_friends') as any)
        .select('friend_id')
        .eq('user_id', userId)
        .eq('game_slug', config.remote.gameSlug);

      const friendIds = [userId, ...((friends ?? []) as any[]).map((f: any) => f.friend_id)];

      // Get their leaderboard scores
      const { data: leaderboard } = await (client.from('idle_leaderboard') as any)
        .select('username, score, user_id')
        .eq('game_slug', config.remote.gameSlug)
        .in('user_id', friendIds)
        .order('score', { ascending: false })
        .limit(50);

      setScores((leaderboard ?? []) as FriendScore[]);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadScores(); }, [userId]);

  const addFriend = async () => {
    const id = friendInput.trim();
    if (!id || !userId) return;
    try {
      const client = getClient(config);
      await (client.from('idle_friends') as any).upsert({
        user_id: userId,
        friend_id: id,
        game_slug: config.remote.gameSlug,
      });
      setFriendInput('');
      setAddingFriend(false);
      loadScores();
    } catch {
      Alert.alert('Error', 'Could not add friend. Check the ID and try again.');
    }
  };

  const primaryRes = config.resources[0];

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Friends</Text>
          <Text style={styles.subtitle}>{config.gameName}</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setAddingFriend(a => !a)}
        >
          <Text style={styles.addBtnText}>{addingFriend ? '✕ Cancel' : '+ Add Friend'}</Text>
        </TouchableOpacity>
      </View>

      {/* Your ID */}
      {userId && (
        <View style={styles.myIdCard}>
          <Text style={styles.myIdLabel}>Your ID (share to add you):</Text>
          <Text style={styles.myIdValue} numberOfLines={1}>{userId}</Text>
        </View>
      )}

      {/* Add friend input */}
      {addingFriend && (
        <View style={styles.addFriendRow}>
          <TextInput
            style={styles.friendInput}
            placeholder="Paste friend's user ID..."
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={friendInput}
            onChangeText={setFriendInput}
            autoCapitalize="none"
          />
          <TouchableOpacity style={styles.confirmBtn} onPress={addFriend}>
            <Text style={styles.confirmText}>Add</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={styles.refreshRow} onPress={loadScores}>
        <Text style={styles.refreshText}>↻ Refresh</Text>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator color={defaultTheme.primaryColor} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={scores}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>No friends added yet. Share your ID to compete!</Text>
          }
          renderItem={({ item, index }) => (
            <View style={[styles.row, index === 0 && styles.rowFirst]}>
              <Text style={styles.rank}>{index < 3 ? MEDALS[index] : `#${index + 1}`}</Text>
              <Text style={styles.username}>{item.username}</Text>
              <Text style={styles.score}>{primaryRes?.icon} {formatNumber(item.score)}</Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: defaultTheme.backgroundColor },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  title: { fontSize: 22, fontWeight: '800', color: defaultTheme.textColor },
  subtitle: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  addBtn: {
    backgroundColor: 'rgba(244,132,95,0.15)', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: defaultTheme.primaryColor,
  },
  addBtnText: { fontSize: 13, fontWeight: '700', color: defaultTheme.primaryColor },
  myIdCard: {
    marginHorizontal: 16, marginTop: 8, padding: 10,
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  myIdLabel: { fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 2 },
  myIdValue: { fontSize: 12, fontFamily: 'monospace', color: 'rgba(255,255,255,0.6)' },
  addFriendRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginTop: 10 },
  friendInput: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 9, color: defaultTheme.textColor,
    fontSize: 13, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  confirmBtn: {
    backgroundColor: defaultTheme.primaryColor, borderRadius: 10,
    paddingHorizontal: 16, justifyContent: 'center',
  },
  confirmText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  refreshRow: { padding: 12, paddingHorizontal: 20 },
  refreshText: { color: defaultTheme.accentColor, fontSize: 13 },
  list: { padding: 16, gap: 8 },
  empty: { color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: 40, fontSize: 14 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: defaultTheme.surfaceColor, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  rowFirst: { borderColor: defaultTheme.accentColor },
  rank: { fontSize: 20, width: 44 },
  username: { flex: 1, fontSize: 15, fontWeight: '600', color: defaultTheme.textColor },
  score: { fontSize: 14, fontWeight: '700', color: defaultTheme.accentColor },
});
