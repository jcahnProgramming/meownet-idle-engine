// ─────────────────────────────────────────────
//  MeowNet Idle Engine — Prestige Shop Screen
// ─────────────────────────────────────────────

import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView,
} from 'react-native';
import { gameConfig as defaultConfig } from '../config/gameConfig';
import { prestigeShopItems } from '../config/gameConfig';
import { GameConfig, GameState, PrestigeUpgradeDef } from '../types/engine';
import { formatNumber } from '../engine/gameLoop';

const defaultTheme = defaultConfig.theme;

interface Props {
  config?: GameConfig;
  state: GameState;
  onBuy: (upgradeId: string) => void;
}

function PrestigeShopCard({
  upgrade, level, canAfford, maxed, onBuy, prestigeIcon,
}: {
  upgrade: PrestigeUpgradeDef;
  level: number;
  canAfford: boolean;
  maxed: boolean;
  onBuy: () => void;
  prestigeIcon: string;
}) {
  return (
    <TouchableOpacity
      style={[styles.card, maxed && styles.cardMaxed, !canAfford && !maxed && styles.cardDisabled]}
      onPress={onBuy}
      disabled={!canAfford || maxed}
      activeOpacity={0.75}
    >
      <Text style={styles.cardIcon}>{upgrade.icon}</Text>
      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardName}>{upgrade.name}</Text>
          {upgrade.maxLevel > 1 && (
            <View style={[styles.levelBadge, maxed && styles.levelBadgeMaxed]}>
              <Text style={styles.levelText}>
                {maxed ? 'MAX' : `${level}/${upgrade.maxLevel}`}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.cardDesc}>{upgrade.description}</Text>
        {!maxed && (
          <Text style={[styles.cardCost, !canAfford && styles.cardCostCantAfford]}>
            {prestigeIcon} {upgrade.cost}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function PrestigeShopScreen({ config: configProp, state, onBuy }: Props) {
  const gameConfig = configProp ?? defaultConfig;
  const items = gameConfig.prestigeShop.length > 0 ? gameConfig.prestigeShop : prestigeShopItems;
  const prestigeIcon = gameConfig.prestige.currencyIcon;
  const currency = state.prestige.currency;

  return (
    <SafeAreaView style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{gameConfig.prestige.currencyName} Shop</Text>
        <View style={styles.currencyBadge}>
          <Text style={styles.currencyIcon}>{prestigeIcon}</Text>
          <Text style={styles.currencyAmount}>{formatNumber(currency)}</Text>
        </View>
      </View>
      <Text style={styles.subtitle}>
        Permanent upgrades that survive every prestige
      </Text>

      <ScrollView contentContainerStyle={styles.list}>
        {items.map(upgrade => {
          const level = state.prestigeShop[upgrade.id] ?? 0;
          const maxed = level >= upgrade.maxLevel;
          const canAfford = currency >= upgrade.cost && !maxed;

          return (
            <PrestigeShopCard
              key={upgrade.id}
              upgrade={upgrade}
              level={level}
              canAfford={canAfford}
              maxed={maxed}
              onBuy={() => onBuy(upgrade.id)}
              prestigeIcon={prestigeIcon}
            />
          );
        })}

        {items.length === 0 && (
          <Text style={styles.empty}>No prestige upgrades available yet.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: defaultTheme.backgroundColor },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
  },
  title: { fontSize: 22, fontWeight: '800', color: defaultTheme.textColor },
  currencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,209,102,0.12)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: defaultTheme.accentColor,
  },
  currencyIcon: { fontSize: 18 },
  currencyAmount: { fontSize: 16, fontWeight: '700', color: defaultTheme.accentColor },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.35)',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  list: { padding: 12, gap: 10 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: defaultTheme.surfaceColor,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,209,102,0.2)',
    gap: 12,
  },
  cardMaxed: {
    borderColor: 'rgba(255,255,255,0.05)',
    opacity: 0.6,
  },
  cardDisabled: { opacity: 0.4 },
  cardIcon: { fontSize: 38, width: 50, textAlign: 'center' },
  cardBody: { flex: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  cardName: { fontSize: 15, fontWeight: '700', color: defaultTheme.textColor, flex: 1 },
  levelBadge: {
    backgroundColor: 'rgba(255,209,102,0.15)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  levelBadgeMaxed: { backgroundColor: 'rgba(255,255,255,0.08)' },
  levelText: { fontSize: 11, fontWeight: '700', color: defaultTheme.accentColor },
  cardDesc: { fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 4 },
  cardCost: { fontSize: 13, fontWeight: '700', color: defaultTheme.accentColor },
  cardCostCantAfford: { color: 'rgba(255,100,100,0.7)' },
  empty: { color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: 60 },
});
