// ─────────────────────────────────────────────
//  MeowNet Idle Engine — Save Slots Screen
// ─────────────────────────────────────────────

import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, Alert, ActivityIndicator,
} from 'react-native';
import { gameConfig as defaultConfig } from '../config/gameConfig';
import { GameConfig, GameState } from '../types/engine';
import {
  SlotMeta, getAllSlotMetas, loadFromSlot,
  deleteSlot, saveToSlot, setActiveSlot,
  getActiveSlot, MAX_SLOTS,
} from '../engine/saveSlots';
import { formatNumber } from '../engine/gameLoop';

const defaultTheme = defaultConfig.theme;

interface Props {
  config?: GameConfig;
  state: GameState;
  activeSlot: number;
  onSwitchSlot: (slot: number, state: GameState) => void;
}

function formatPlaytime(ms: number): string {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatDate(ts: number): string {
  if (!ts) return 'Never';
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function SaveSlotsScreen({ config: configProp, state, activeSlot, onSwitchSlot }: Props) {
  const config = configProp ?? defaultConfig;
  const [metas, setMetas] = useState<SlotMeta[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    const m = await getAllSlotMetas(config);
    setMetas(m);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const handleSwitch = async (slot: number) => {
    if (slot === activeSlot) return;
    const loaded = await loadFromSlot(config, slot);
    if (loaded) {
      await setActiveSlot(config, slot);
      onSwitchSlot(slot, loaded);
    } else {
      Alert.alert('Empty Slot', 'This slot has no save data. Start a new game here?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'New Game',
          onPress: async () => {
            await setActiveSlot(config, slot);
            onSwitchSlot(slot, state); // will create fresh state
          },
        },
      ]);
    }
  };

  const handleSave = async (slot: number) => {
    await saveToSlot(config, state, slot);
    await refresh();
  };

  const handleDelete = (slot: number) => {
    Alert.alert('Delete Save', `Delete Slot ${slot + 1}? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteSlot(config, slot);
          await refresh();
        },
      },
    ]);
  };

  const primaryRes = config.resources[0];

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Save Slots</Text>
        <Text style={styles.subtitle}>{MAX_SLOTS} slots available</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={defaultTheme.primaryColor} style={{ marginTop: 60 }} />
      ) : (
        <View style={styles.list}>
          {metas.map(meta => {
            const isActive = meta.slot === activeSlot;
            return (
              <View key={meta.slot} style={[styles.card, isActive && styles.cardActive]}>
                {/* Slot info */}
                <View style={styles.cardLeft}>
                  <View style={styles.slotBadge}>
                    <Text style={styles.slotNum}>{meta.slot + 1}</Text>
                  </View>
                  <View>
                    {meta.isEmpty ? (
                      <Text style={styles.emptyLabel}>Empty Slot</Text>
                    ) : (
                      <>
                        <Text style={styles.slotResource}>
                          {primaryRes?.icon} {formatNumber(meta.primaryResourceAmount)}
                        </Text>
                        <Text style={styles.slotMeta}>
                          {formatPlaytime(meta.totalPlaytimeMs)} · {meta.prestigeCount} prestiges
                        </Text>
                        <Text style={styles.slotDate}>{formatDate(meta.lastSavedAt)}</Text>
                      </>
                    )}
                  </View>
                </View>

                {/* Active badge */}
                {isActive && (
                  <View style={styles.activeBadge}>
                    <Text style={styles.activeText}>ACTIVE</Text>
                  </View>
                )}

                {/* Actions */}
                <View style={styles.actions}>
                  {!isActive && (
                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleSwitch(meta.slot)}>
                      <Text style={styles.actionText}>Load</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.actionSave]}
                    onPress={() => handleSave(meta.slot)}
                  >
                    <Text style={styles.actionText}>Save</Text>
                  </TouchableOpacity>
                  {!meta.isEmpty && !isActive && (
                    <TouchableOpacity style={[styles.actionBtn, styles.actionDelete]} onPress={() => handleDelete(meta.slot)}>
                      <Text style={styles.actionText}>🗑</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: defaultTheme.backgroundColor },
  header: {
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  title: { fontSize: 22, fontWeight: '800', color: defaultTheme.textColor },
  subtitle: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  list: { padding: 12, gap: 10 },
  card: {
    backgroundColor: defaultTheme.surfaceColor,
    borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  cardActive: { borderColor: defaultTheme.primaryColor },
  cardLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  slotBadge: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  slotNum: { fontSize: 18, fontWeight: '800', color: defaultTheme.textColor },
  emptyLabel: { fontSize: 14, color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' },
  slotResource: { fontSize: 15, fontWeight: '700', color: defaultTheme.textColor },
  slotMeta: { fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 1 },
  slotDate: { fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 1 },
  activeBadge: {
    backgroundColor: 'rgba(244,132,95,0.15)',
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: defaultTheme.primaryColor,
  },
  activeText: { fontSize: 10, fontWeight: '800', color: defaultTheme.primaryColor },
  actions: { flexDirection: 'row', gap: 6 },
  actionBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7,
  },
  actionSave: { backgroundColor: 'rgba(244,132,95,0.15)' },
  actionDelete: { backgroundColor: 'rgba(220,50,50,0.15)' },
  actionText: { fontSize: 12, fontWeight: '700', color: defaultTheme.textColor },
});
