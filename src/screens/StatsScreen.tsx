// ─────────────────────────────────────────────
//  MeowNet Idle Engine — Stats Screen
//  Lifetime stats: resources, buildings, taps,
//  prestige history, session info, production.
// ─────────────────────────────────────────────

import React from 'react';
import {
  View, Text, ScrollView, StyleSheet, SafeAreaView,
} from 'react-native';
import { gameConfig as defaultConfig } from '../config/gameConfig';
import { GameConfig, GameState } from '../types/engine';
import { formatNumber, calculateProductionRates } from '../engine/gameLoop';

const defaultTheme = defaultConfig.theme;

interface Props {
  config?: GameConfig;
  state: GameState;
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

function formatPlaytime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function StatsScreen({ config: configProp, state }: Props) {
  const config = configProp ?? defaultConfig;
  const rates = calculateProductionRates(config, state);

  // Total buildings owned
  const totalBuildings = Object.values(state.buildings).reduce((a, b) => a + b, 0);

  // Total upgrades purchased
  const totalUpgrades = Object.values(state.upgrades).filter(Boolean).length;

  // Achievements unlocked
  const totalAchievements = Object.keys(state.achievements).length;
  const totalAchievementsDef = config.achievements?.length ?? 0;

  // Daily challenge completions
  const dailyCompleted = Object.values(state.dailyChallenges?.completed ?? {}).filter(Boolean).length;

  // Active boosts
  const now = Date.now();
  const activeBoosts = (state.dailyChallenges?.activeBoosts ?? [])
    .filter(b => b.expiresAt > now);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Statistics</Text>
        <Text style={styles.subtitle}>{config.gameName}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* Session */}
        <Section title="📊 Session">
          <StatRow label="Total Playtime" value={formatPlaytime(state.totalPlaytimeMs)} />
          <StatRow label="Taps" value={formatNumber(state.tapCount ?? 0)} />
          <StatRow label="Prestiges" value={String(state.prestige.totalPrestiges)} />
          <StatRow
            label={`${config.prestige.currencyName} Earned`}
            value={`${config.prestige.currencyIcon} ${formatNumber(state.prestige.currency)}`}
          />
        </Section>

        {/* Resources */}
        <Section title="💰 Resources">
          {config.resources.map(resource => (
            <StatRow
              key={resource.id}
              label={`${resource.icon} ${resource.name}`}
              value={formatNumber(state.resources[resource.id] ?? 0)}
            />
          ))}
          <View style={styles.divider} />
          {config.resources.map(resource => (
            <StatRow
              key={`rate_${resource.id}`}
              label={`${resource.name}/sec`}
              value={formatNumber(rates[resource.id] ?? 0)}
            />
          ))}
        </Section>

        {/* Buildings */}
        <Section title="🏗 Buildings">
          <StatRow label="Total Owned" value={formatNumber(totalBuildings)} />
          {config.buildings.map(building => {
            const count = state.buildings[building.id] ?? 0;
            if (count === 0) return null;
            return (
              <StatRow
                key={building.id}
                label={`${building.icon} ${building.name}`}
                value={String(count)}
              />
            );
          })}
        </Section>

        {/* Upgrades */}
        <Section title="⚡ Upgrades">
          <StatRow
            label="Purchased"
            value={`${totalUpgrades} / ${config.upgrades.length}`}
          />
        </Section>

        {/* Achievements */}
        <Section title="🏆 Achievements">
          <StatRow
            label="Unlocked"
            value={`${totalAchievements}${totalAchievementsDef > 0 ? ` / ${totalAchievementsDef}` : ''}`}
          />
          {Object.entries(state.achievements).map(([id, data]) => {
            const def = config.achievements?.find(a => a.id === id);
            if (!def) return null;
            const date = new Date(data.unlockedAt).toLocaleDateString();
            return (
              <StatRow
                key={id}
                label={`${def.icon} ${def.name}`}
                value={date}
              />
            );
          })}
        </Section>

        {/* Daily Challenges */}
        <Section title="📅 Daily Challenges">
          <StatRow label="Completed Today" value={String(dailyCompleted)} />
          {activeBoosts.length > 0 && (
            activeBoosts.map((boost, i) => {
              const remaining = Math.max(0, Math.floor((boost.expiresAt - now) / 60000));
              return (
                <StatRow
                  key={i}
                  label={`⚡ ×${boost.multiplier} Boost`}
                  value={`${remaining}m left`}
                />
              );
            })
          )}
        </Section>

        {/* Prestige Shop */}
        <Section title="⭐ Prestige Shop">
          {config.prestigeShop?.map(upgrade => {
            const level = state.prestigeShop?.[upgrade.id] ?? 0;
            if (level === 0) return null;
            return (
              <StatRow
                key={upgrade.id}
                label={`${upgrade.icon} ${upgrade.name}`}
                value={`Level ${level}/${upgrade.maxLevel}`}
              />
            );
          })}
          {!Object.values(state.prestigeShop ?? {}).some(v => v > 0) && (
            <Text style={styles.empty}>No prestige upgrades yet</Text>
          )}
        </Section>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: defaultTheme.backgroundColor },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  title: { fontSize: 22, fontWeight: '800', color: defaultTheme.textColor },
  subtitle: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  content: { padding: 12, gap: 12 },
  card: {
    backgroundColor: defaultTheme.surfaceColor,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    gap: 2,
  },
  cardTitle: {
    fontSize: 12,
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
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginVertical: 6,
  },
  empty: { fontSize: 13, color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' },
});
