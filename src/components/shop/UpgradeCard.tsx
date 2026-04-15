// ─────────────────────────────────────────────
//  MeowNet Idle Engine — UpgradeCard
// ─────────────────────────────────────────────

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { UpgradeDef } from '../../types/engine';
import { gameConfig } from '../../config/gameConfig';
import { formatNumber } from '../../engine/gameLoop';

const theme = gameConfig.theme;

interface Props {
  upgrade: UpgradeDef;
  canAfford: boolean;
  onBuy: () => void;
}

const effectLabel = (upgrade: UpgradeDef): string => {
  const { effect } = upgrade;
  const mult = effect.multiplier ?? 1;
  switch (effect.type) {
    case 'building_multiplier': {
      const b = gameConfig.buildings.find(b => b.id === effect.targetId);
      return `${b?.icon ?? ''} ${b?.name ?? ''} ×${mult}`;
    }
    case 'global_multiplier':
      return `All production ×${mult}`;
    case 'tap_multiplier':
      return `Tap power ×${mult}`;
    case 'unlock':
      return 'Unlocks new content';
    default:
      return '';
  }
};

export function UpgradeCard({ upgrade, canAfford, onBuy }: Props) {
  return (
    <TouchableOpacity
      style={[styles.card, !canAfford && styles.cardDisabled]}
      onPress={onBuy}
      disabled={!canAfford}
      activeOpacity={0.75}
    >
      <Text style={styles.icon}>{upgrade.icon}</Text>

      <View style={styles.body}>
        <Text style={styles.name}>{upgrade.name}</Text>
        <Text style={styles.desc}>{upgrade.description}</Text>
        <Text style={styles.effect}>{effectLabel(upgrade)}</Text>
      </View>

      <View style={styles.costWrap}>
        {Object.entries(upgrade.cost).map(([rid, amount]) => {
          const r = gameConfig.resources.find(r => r.id === rid);
          return (
            <Text key={rid} style={[styles.cost, !canAfford && styles.costCantAfford]}>
              {r?.icon} {formatNumber(amount)}
            </Text>
          );
        })}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surfaceColor,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: `${theme.accentColor}30`,
    gap: 10,
  },
  cardDisabled: { opacity: 0.4 },
  icon: { fontSize: 38, width: 52, textAlign: 'center' },
  body: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: theme.textColor },
  desc: { fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2 },
  effect: { fontSize: 12, color: theme.primaryColor, marginTop: 3, fontWeight: '600' },
  costWrap: { alignItems: 'flex-end', gap: 2 },
  cost: { fontSize: 13, fontWeight: '700', color: theme.accentColor },
  costCantAfford: { color: 'rgba(255,100,100,0.7)' },
});
