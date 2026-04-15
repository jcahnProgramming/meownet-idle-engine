// ─────────────────────────────────────────────
//  GAME CONFIG — Edit this file to make your game
//  Fork this repo → change this file → done.
//
//  Example: "Cookie Clicker"-style cat café game
// ─────────────────────────────────────────────

import { GameConfig } from '../types/engine';

export const gameConfig: GameConfig = {
  gameId: 'cat-cafe',
  gameName: 'Cat Café',
  version: '1.0.0',

  // ── Resources ──────────────────────────────
  resources: [
    {
      id: 'cookies',
      name: 'Cookies',
      icon: '🍪',
      startingValue: 0,
      cap: 'infinite',
      displayPrecision: 0,
    },
    {
      id: 'milk',
      name: 'Milk',
      icon: '🥛',
      startingValue: 0,
      cap: 1000,
      displayPrecision: 1,
    },
  ],

  // ── Buildings ──────────────────────────────
  buildings: [
    {
      id: 'cat',
      name: 'Cat',
      description: 'A happy cat baking cookies.',
      icon: '🐱',
      baseCost: { cookies: 15 },
      costScaling: 1.15,
      baseProduction: { cookies: 0.1 },
    },
    {
      id: 'oven',
      name: 'Oven',
      description: 'Bakes cookies automatically.',
      icon: '🔥',
      baseCost: { cookies: 100 },
      costScaling: 1.15,
      baseProduction: { cookies: 0.5 },
      unlockCondition: { resourceId: 'cookies', amount: 100 },
    },
    {
      id: 'catcafe',
      name: 'Cat Café',
      description: 'A whole café of baking cats.',
      icon: '🏠',
      baseCost: { cookies: 1100, milk: 50 },
      costScaling: 1.15,
      baseProduction: { cookies: 4, milk: 0.1 },
      unlockCondition: { resourceId: 'cookies', amount: 1000 },
    },
  ],

  // ── Upgrades ───────────────────────────────
  upgrades: [
    {
      id: 'cat_mittens',
      name: 'Oven Mittens',
      description: 'Cats bake twice as fast.',
      icon: '🧤',
      cost: { cookies: 100 },
      effect: { type: 'building_multiplier', targetId: 'cat', multiplier: 2 },
      unlockCondition: { buildingId: 'cat', buildingCount: 1 },
    },
    {
      id: 'better_oven',
      name: 'Convection Oven',
      description: 'Ovens produce 3× more cookies.',
      icon: '⚡',
      cost: { cookies: 500 },
      effect: { type: 'building_multiplier', targetId: 'oven', multiplier: 3 },
      unlockCondition: { buildingId: 'oven', buildingCount: 5 },
    },
    {
      id: 'tap_boost',
      name: 'Power Paws',
      description: 'Each tap produces 5× more.',
      icon: '🐾',
      cost: { cookies: 200 },
      effect: { type: 'tap_multiplier', multiplier: 5 },
    },
  ],

  // ── Prestige ───────────────────────────────
  prestige: {
    enabled: true,
    requiredResource: 'cookies',
    requiredAmount: 1_000_000,
    currencyName: 'Pawprints',
    currencyIcon: '🐾',
    formulaExponent: 0.5,
    persistedUpgrades: ['tap_boost'],
  },

  // ── Theme ──────────────────────────────────
  theme: {
    primaryColor: '#F4845F',
    accentColor: '#FFD166',
    backgroundColor: '#1A1020',
    surfaceColor: '#2A1F30',
    textColor: '#F5EFE6',
  },

  // ── Balance ────────────────────────────────
  balance: {
    tickRateMs: 100,
    offlineEarningsRate: 0.5,
    maxOfflineHours: 8,
    tapProductionMultiplier: 1,
  },

  // ── Remote (Supabase hosted) ────────────────
  // Replace with your hosted Supabase project values from supabase.com
  remote: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL!,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
    gameSlug: 'cat-cafe',
  },
};
