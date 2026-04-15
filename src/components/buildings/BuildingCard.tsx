// ─────────────────────────────────────────────
//  MeowNet Idle Engine — BuildingCard
// ─────────────────────────────────────────────

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BuildingDef } from '../../types/engine';
import { gameConfig } from '../../config/gameConfig';
import { formatNumber } from '../../engine/gameLoop';
import { BuyMode } from './BuyModeToggle';
import { BuildingSprite } from './BuildingSprite';

const theme = gameConfig.theme;

interface Props {
  building: BuildingDef;
  count: number;
  cost: Record<string, number>;
  canAfford: boolean;
  productionPerSec: Record<string, number>;
  buyMode?: BuyMode;
  onBuy: () => void;
}

export function BuildingCard({ building, count, cost, canAfford, productionPerSec, buyMode = 1, onBuy }: Props) {
  const buyLabel = buyMode === 'max' ? 'Max' : buyMode === 1 ? null : `x${buyMode}`;
  return (
    <TouchableOpacity
      style={[styles.card, !canAfford && styles.cardDisabled]}
      onPress={onBuy}
      disabled={!canAfford}
      activeOpacity={0.75}
    >
      {/* Animated sprite + count badge */}
      <View style={styles.iconWrap}>
        <BuildingSprite icon={building.icon} count={count} size={34} />
        {count > 0 && (
          <View style={[styles.badge, { backgroundColor: theme.primaryColor }]}>
            <Text style={styles.badgeText}>{buyLabel ?? count}</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.body}>
        <Text style={styles.name}>{building.name}</Text>
        <Text style={styles.desc} numberOfLines={1}>{building.description}</Text>

        {/* Production rate when owned */}
        {count > 0 && (
          <Text style={styles.production}>
            {Object.entries(productionPerSec).map(([rid, rate]) => {
              const r = gameConfig.resources.find(r => r.id === rid);
              return `${r?.icon ?? ''} ${formatNumber(rate)}/s`;
            }).join('  ')}
          </Text>
        )}
      </View>

      {/* Cost */}
      <View style={styles.costWrap}>
        {Object.entries(cost).map(([rid, amount]) => {
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
    borderColor: 'rgba(255,255,255,0.07)',
    gap: 10,
  },
  cardDisabled: { opacity: 0.4 },
  iconWrap: { position: 'relative', width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 38 },
  badge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { fontSize: 11, fontWeight: '800', color: '#fff' },
  body: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: theme.textColor },
  desc: { fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2 },
  production: { fontSize: 12, color: theme.accentColor, marginTop: 3 },
  costWrap: { alignItems: 'flex-end', gap: 2 },
  cost: { fontSize: 13, fontWeight: '700', color: theme.accentColor },
  costCantAfford: { color: 'rgba(255,100,100,0.7)' },
});
