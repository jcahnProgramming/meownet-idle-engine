// ─────────────────────────────────────────────
//  MeowNet Idle Engine — Buy Mode Toggle
// ─────────────────────────────────────────────

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { gameConfig } from '../../config/gameConfig';

const theme = gameConfig.theme;

export type BuyMode = 1 | 10 | 100 | 'max';
const MODES: BuyMode[] = [1, 10, 100, 'max'];

interface Props {
  mode: BuyMode;
  onChange: (mode: BuyMode) => void;
}

export function BuyModeToggle({ mode, onChange }: Props) {
  return (
    <View style={styles.container}>
      {MODES.map(m => (
        <TouchableOpacity
          key={String(m)}
          style={[styles.button, mode === m && styles.buttonActive]}
          onPress={() => onChange(m)}
        >
          <Text style={[styles.label, mode === m && styles.labelActive]}>
            {m === 'max' ? 'Max' : `x${m}`}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  button: {
    flex: 1,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  buttonActive: {
    backgroundColor: 'rgba(244,132,95,0.2)',
    borderColor: theme.primaryColor,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
  },
  labelActive: {
    color: theme.primaryColor,
  },
});
