// ─────────────────────────────────────────────
//  MeowNet Idle Engine — Gacha / Loot Screen
// ─────────────────────────────────────────────

import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, Modal,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withSpring, withTiming, withDelay,
} from 'react-native-reanimated';
import { gameConfig as defaultConfig } from '../config/gameConfig';
import { GameConfig, GameState } from '../types/engine';
import { GachaReward, DEFAULT_PACKS, rollGachaPack } from '../engine/gachaEngine';
import { formatNumber } from '../engine/gameLoop';

const defaultTheme = defaultConfig.theme;

const RARITY_COLORS = {
  common:    'rgba(255,255,255,0.5)',
  rare:      '#6AB0F5',
  epic:      '#C084FC',
  legendary: '#FFD166',
};

const RARITY_BG = {
  common:    'rgba(255,255,255,0.05)',
  rare:      'rgba(106,176,245,0.1)',
  epic:      'rgba(192,132,252,0.12)',
  legendary: 'rgba(255,209,102,0.15)',
};

function RewardCard({ reward, index }: { reward: GachaReward; index: number }) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  React.useEffect(() => {
    const delay = index * 80;
    scale.value = withDelay(delay, withSpring(1, { damping: 12, stiffness: 200 }));
    opacity.value = withDelay(delay, withTiming(1, { duration: 200 }));
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[
      styles.rewardCard,
      { backgroundColor: RARITY_BG[reward.rarity] },
      style,
    ]}>
      <Text style={styles.rewardIcon}>{reward.icon}</Text>
      <Text style={[styles.rewardLabel, { color: RARITY_COLORS[reward.rarity] }]}>
        {reward.label}
      </Text>
      <Text style={[styles.rarityBadge, { color: RARITY_COLORS[reward.rarity] }]}>
        {reward.rarity.toUpperCase()}
      </Text>
    </Animated.View>
  );
}

interface Props {
  config?: GameConfig;
  state: GameState;
  onRoll: (packId: string) => GachaReward[] | null;
}

export default function GachaScreen({ config: configProp, state, onRoll }: Props) {
  const config = configProp ?? defaultConfig;
  const [results, setResults] = useState<GachaReward[] | null>(null);
  const [showModal, setShowModal] = useState(false);

  const handleRoll = (packId: string) => {
    const rewards = onRoll(packId);
    if (rewards) {
      setResults(rewards);
      setShowModal(true);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Loot Packs</Text>
        <View style={styles.currencyBadge}>
          <Text style={styles.currencyIcon}>{config.prestige.currencyIcon}</Text>
          <Text style={styles.currencyAmount}>{formatNumber(state.prestige.currency)}</Text>
        </View>
      </View>
      <Text style={styles.subtitle}>Spend {config.prestige.currencyName} for random rewards</Text>

      <ScrollView contentContainerStyle={styles.packs}>
        {DEFAULT_PACKS.map(pack => {
          const canAfford = state.prestige.currency >= pack.cost;
          return (
            <TouchableOpacity
              key={pack.id}
              style={[styles.packCard, !canAfford && styles.packDisabled]}
              onPress={() => handleRoll(pack.id)}
              disabled={!canAfford}
              activeOpacity={0.75}
            >
              <Text style={styles.packIcon}>{pack.icon}</Text>
              <View style={styles.packInfo}>
                <Text style={styles.packName}>{pack.name}</Text>
                <Text style={styles.packDesc}>{pack.description}</Text>
              </View>
              <View style={styles.packCost}>
                <Text style={styles.packCostIcon}>{config.prestige.currencyIcon}</Text>
                <Text style={[styles.packCostAmount, !canAfford && styles.cantAfford]}>
                  {pack.cost}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Odds table */}
        <View style={styles.oddsCard}>
          <Text style={styles.oddsTitle}>Drop Rates</Text>
          {(['common', 'rare', 'epic', 'legendary'] as const).map(rarity => (
            <View key={rarity} style={styles.oddsRow}>
              <View style={[styles.rarityDot, { backgroundColor: RARITY_COLORS[rarity] }]} />
              <Text style={styles.oddsLabel}>{rarity.charAt(0).toUpperCase() + rarity.slice(1)}</Text>
              <Text style={[styles.oddsValue, { color: RARITY_COLORS[rarity] }]}>
                {rarity === 'common' ? '~52%' : rarity === 'rare' ? '~39%' : rarity === 'epic' ? '~8%' : '~1%'}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Results modal */}
      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>You got...</Text>
            <View style={styles.rewardsGrid}>
              {results?.map((r, i) => <RewardCard key={i} reward={r} index={i} />)}
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowModal(false)}>
              <Text style={styles.closeBtnText}>Collect!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: defaultTheme.backgroundColor },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4,
  },
  title: { fontSize: 22, fontWeight: '800', color: defaultTheme.textColor },
  currencyBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,209,102,0.12)', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: defaultTheme.accentColor,
  },
  currencyIcon: { fontSize: 18 },
  currencyAmount: { fontSize: 16, fontWeight: '700', color: defaultTheme.accentColor },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.35)', paddingHorizontal: 20, marginBottom: 12 },
  packs: { padding: 12, gap: 12 },
  packCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: defaultTheme.surfaceColor, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: 'rgba(255,209,102,0.25)',
  },
  packDisabled: { opacity: 0.4 },
  packIcon: { fontSize: 42, width: 52, textAlign: 'center' },
  packInfo: { flex: 1 },
  packName: { fontSize: 16, fontWeight: '700', color: defaultTheme.textColor },
  packDesc: { fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2 },
  packCost: { alignItems: 'center', gap: 2 },
  packCostIcon: { fontSize: 20 },
  packCostAmount: { fontSize: 16, fontWeight: '800', color: defaultTheme.accentColor },
  cantAfford: { color: 'rgba(255,100,100,0.7)' },
  oddsCard: {
    backgroundColor: defaultTheme.surfaceColor, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', gap: 8,
  },
  oddsTitle: {
    fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.3)',
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4,
  },
  oddsRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rarityDot: { width: 8, height: 8, borderRadius: 4 },
  oddsLabel: { flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.55)' },
  oddsValue: { fontSize: 13, fontWeight: '700' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
  modalCard: {
    backgroundColor: defaultTheme.surfaceColor, borderRadius: 24, padding: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    fontSize: 22, fontWeight: '800', color: defaultTheme.textColor,
    textAlign: 'center', marginBottom: 16,
  },
  rewardsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  rewardCard: {
    width: '30%', borderRadius: 12, padding: 10, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', gap: 4,
  },
  rewardIcon: { fontSize: 28 },
  rewardLabel: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
  rarityBadge: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  closeBtn: {
    marginTop: 16, backgroundColor: defaultTheme.primaryColor, borderRadius: 14,
    paddingVertical: 12, alignItems: 'center',
  },
  closeBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
});
