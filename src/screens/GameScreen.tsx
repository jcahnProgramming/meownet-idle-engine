// ─────────────────────────────────────────────
//  MeowNet Idle Engine — Main Game Screen
//  Config-driven: reads gameConfig.ts for all
//  labels, icons, colors, and layout decisions
// ─────────────────────────────────────────────

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { gameConfig as defaultConfig } from '../config/gameConfig';
import { GameConfig } from '../types/engine';
import { useGameEngine } from '../hooks/useGameEngine';
import { BuildingCard } from '../components/buildings/BuildingCard';
import { UpgradeCard } from '../components/shop/UpgradeCard';
import { HUD } from '../components/hud/HUD';
import { TapTarget } from '../components/hud/TapTarget';
import { OfflineEarningsModal } from '../components/hud/OfflineEarningsModal';
import { AchievementToast } from '../components/hud/AchievementToast';
import { BuyModeToggle, BuyMode } from '../components/buildings/BuyModeToggle';

type EngineType = ReturnType<typeof useGameEngine>;

interface Props {
  userId?: string;
  config?: GameConfig;
  engine?: EngineType;
}

export default function GameScreen({ userId, config: configProp, engine: engineProp }: Props) {
  const gameConfig = configProp ?? defaultConfig;
  const theme = gameConfig.theme;
  const ownEngine = useGameEngine(
    engineProp ? { config: gameConfig, userId: undefined } : { config: gameConfig, userId }
  );
  const engine = engineProp ?? ownEngine;

  const {
    state,
    productionRates,
    getBuildingCost,
    getBuildingBulkCost,
    prestigeAvailable,
    pendingOfflineEarnings,
    dismissOfflineEarnings,
    pendingAchievement,
    dismissAchievement,
    tap,
    purchaseBuilding,
    purchaseBuildingBulk,
    purchaseUpgrade,
    prestige,
  } = engine;

  const [activeTab, setActiveTab] = useState<'buildings' | 'upgrades'>('buildings');
  const [buyMode, setBuyMode] = useState<BuyMode>(1);

  const primaryResource = gameConfig.resources[0];

  // Tap multiplier from purchased upgrades
  const tapMultiplier = gameConfig.upgrades.reduce((acc, u) => {
    if (state.upgrades[u.id] && u.effect.type === 'tap_multiplier') {
      return acc * (u.effect.multiplier ?? 1);
    }
    return acc;
  }, gameConfig.balance.tapProductionMultiplier);

  return (
    <SafeAreaView style={styles.root}>
      <OfflineEarningsModal
        earnings={pendingOfflineEarnings}
        onCollect={dismissOfflineEarnings}
      />
      <AchievementToast
        achievement={pendingAchievement}
        onDismiss={dismissAchievement}
      />

      {/* ── HUD ── */}
      <HUD state={state} productionRates={productionRates} />

      {/* ── Tap button ── */}
      <View style={styles.tapArea}>
        <TapTarget onTap={tap} tapMultiplier={tapMultiplier}>
          <View style={styles.tapButton}>
            <Text style={styles.tapIcon}>{primaryResource?.icon ?? '👆'}</Text>
            <Text style={styles.tapLabel}>Tap!</Text>
          </View>
        </TapTarget>
      </View>

      {/* ── Prestige button ── */}
      {prestigeAvailable && (
        <TouchableOpacity style={styles.prestigeButton} onPress={prestige}>
          <Text style={styles.prestigeButtonText}>
            {gameConfig.prestige.currencyIcon} Prestige — Reset for bonus!
          </Text>
        </TouchableOpacity>
      )}

      {/* ── Tab bar ── */}
      <View style={styles.tabBar}>
        {(['buildings', 'upgrades'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'buildings' ? '🏗 Buildings' : '⚡ Upgrades'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Buildings list ── */}
      {activeTab === 'buildings' && (
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          <BuyModeToggle mode={buyMode} onChange={setBuyMode} />
          {gameConfig.buildings.map(building => {
            const count = state.buildings[building.id] ?? 0;
            const cost = buyMode === 1
              ? getBuildingCost(building.id)
              : getBuildingBulkCost(building.id, buyMode);
            const canAfford = Object.entries(cost).every(
              ([rid, amt]) => (state.resources[rid] ?? 0) >= amt
            );
            const unlocked = !building.unlockCondition ||
              (state.resources[building.unlockCondition.resourceId] ?? 0) >=
                building.unlockCondition.amount;

            if (!unlocked && count === 0) return null;

            const perBuilding: Record<string, number> = {};
            for (const [rid] of Object.entries(building.baseProduction)) {
              perBuilding[rid] = (productionRates[rid] ?? 0);
            }

            return (
              <BuildingCard
                key={building.id}
                building={building}
                count={count}
                cost={cost}
                canAfford={canAfford}
                productionPerSec={perBuilding}
                buyMode={buyMode}
                onBuy={() => buyMode === 1
                  ? purchaseBuilding(building.id)
                  : purchaseBuildingBulk(building.id, buyMode)
                }
              />
            );
          })}
        </ScrollView>
      )}

      {/* ── Upgrades list ── */}
      {activeTab === 'upgrades' && (
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {gameConfig.upgrades.map(upgrade => {
            if (state.upgrades[upgrade.id]) return null;

            const uc = upgrade.unlockCondition;
            const unlocked = !uc ||
              (uc.buildingId ? (state.buildings[uc.buildingId] ?? 0) >= (uc.buildingCount ?? 1) : true) &&
              (uc.resourceId ? (state.resources[uc.resourceId] ?? 0) >= (uc.resourceAmount ?? 0) : true) &&
              (uc.upgradeId ? !!state.upgrades[uc.upgradeId] : true);

            if (!unlocked) return null;

            const canAfford = Object.entries(upgrade.cost).every(
              ([rid, amt]) => (state.resources[rid] ?? 0) >= amt
            );

            return (
              <UpgradeCard
                key={upgrade.id}
                upgrade={upgrade}
                canAfford={canAfford}
                onBuy={() => purchaseUpgrade(upgrade.id)}
              />
            );
          })}
          {gameConfig.upgrades.every(u => state.upgrades[u.id]) && (
            <Text style={styles.emptyText}>All upgrades purchased! 🎉</Text>
          )}
        </ScrollView>
      )}

    </SafeAreaView>
  );
}

const defaultTheme = defaultConfig.theme;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: defaultTheme.backgroundColor },
  tapArea: { alignItems: 'center', paddingVertical: 20 },
  tapButton: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: defaultTheme.primaryColor,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: defaultTheme.primaryColor,
    shadowOpacity: 0.6,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  tapIcon: { fontSize: 52 },
  tapLabel: { fontSize: 16, fontWeight: '700', color: '#fff', marginTop: 4 },
  prestigeButton: {
    marginHorizontal: 20,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,209,102,0.12)',
    borderWidth: 1,
    borderColor: defaultTheme.accentColor,
    alignItems: 'center',
  },
  prestigeButtonText: { color: defaultTheme.accentColor, fontWeight: '700', fontSize: 14 },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  tab: { flex: 1, paddingVertical: 11, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: defaultTheme.primaryColor },
  tabText: { color: 'rgba(255,255,255,0.35)', fontSize: 14, fontWeight: '600' },
  tabTextActive: { color: defaultTheme.primaryColor },
  list: { flex: 1 },
  listContent: { padding: 12, gap: 8 },
  emptyText: { color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: 40, fontSize: 15 },
});
