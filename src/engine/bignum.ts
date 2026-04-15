// ─────────────────────────────────────────────
//  MeowNet Idle Engine — BigNumber utilities
//  Wraps decimal.js for safe large number math
//  All resource values stored as plain numbers
//  but arithmetic done through Decimal to avoid
//  floating point drift at high values.
// ─────────────────────────────────────────────

import Decimal from 'decimal.js';

// Configure for idle game scale
Decimal.set({ precision: 30, toExpPos: 21, toExpNeg: -7 });

export function add(a: number, b: number): number {
  return new Decimal(a).plus(b).toNumber();
}

export function multiply(a: number, b: number): number {
  return new Decimal(a).times(b).toNumber();
}

export function floor(a: number): number {
  return new Decimal(a).floor().toNumber();
}

export function pow(base: number, exp: number): number {
  return new Decimal(base).pow(exp).toNumber();
}

export function min(a: number, b: number): number {
  return Decimal.min(a, b).toNumber();
}

// ── Number formatter for display ──────────────
const SUFFIXES = [
  '', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No',
  'Dc', 'UDc', 'DDc', 'TDc', 'QaDc', 'QiDc', 'SxDc', 'SpDc',
];

export function formatNumber(n: number): string {
  if (!isFinite(n) || isNaN(n)) return '0';
  if (n < 0) return '-' + formatNumber(-n);
  if (n < 1000) return new Decimal(n).toDecimalPlaces(1).toString();

  const d = new Decimal(n);
  const exp = Math.floor(d.log(1000).toNumber());
  const suffixIndex = Math.min(exp, SUFFIXES.length - 1);

  if (suffixIndex < SUFFIXES.length) {
    const scaled = d.div(new Decimal(1000).pow(suffixIndex));
    return scaled.toDecimalPlaces(2).toString() + SUFFIXES[suffixIndex];
  }

  // Fallback to scientific notation for truly massive numbers
  return d.toExponential(2);
}
