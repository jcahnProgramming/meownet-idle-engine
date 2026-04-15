// ─────────────────────────────────────────────
//  MeowNet Idle Engine — Sound Engine
//  Uses expo-av for audio playback.
//  Built-in sounds are generated via AudioContext
//  oscillators so no asset files are required.
//  Forks can replace sound keys with asset paths.
// ─────────────────────────────────────────────

import { useRef, useCallback, useEffect, useState } from 'react';
import { Audio } from 'expo-av';
import { GameConfig } from '../types/engine';

type SoundKey = 'tap' | 'purchase' | 'upgrade' | 'achievement' | 'prestige' | 'milestone';

// ── Builtin tone definitions ─────────────────
// Each entry: [frequency, duration_ms, waveform, volume]
const BUILTIN_TONES: Record<string, [number, number, OscillatorType, number]> = {
  'builtin:tap':         [880,  40,  'sine',     0.18],
  'builtin:purchase':    [523,  120, 'sine',     0.35],
  'builtin:upgrade':     [659,  180, 'triangle', 0.40],
  'builtin:achievement': [784,  300, 'sine',     0.50],
  'builtin:prestige':    [440,  500, 'sine',     0.55],
  'builtin:milestone':   [600,  150, 'triangle', 0.30],
};

// ── Web Audio oscillator player ──────────────
function playTone(freq: number, durationMs: number, type: OscillatorType, vol: number, masterVol: number) {
  try {
    // @ts-ignore — available in React Native via Hermes JSI on device
    const AudioContext = (global as any).AudioContext ?? (global as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol * masterVol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);
    osc.start();
    osc.stop(ctx.currentTime + durationMs / 1000);
  } catch {}
}

export function useSoundEngine(config: GameConfig) {
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);
  const lastTapRef = useRef(0);

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  // Request audio session on iOS
  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: false,
      staysActiveInBackground: false,
    }).catch(() => {});
  }, []);

  const play = useCallback((key: SoundKey) => {
    if (!config.sound.enabled || mutedRef.current) return;
    const soundKey = config.sound.sounds[key];
    if (!soundKey) return;

    // Throttle tap sounds to max 20/sec
    if (key === 'tap') {
      const now = Date.now();
      if (now - lastTapRef.current < 50) return;
      lastTapRef.current = now;
    }

    if (soundKey.startsWith('builtin:')) {
      const tone = BUILTIN_TONES[soundKey];
      if (tone) playTone(tone[0], tone[1], tone[2], tone[3], config.sound.volume);
      return;
    }

    // Asset-based sound (for forks using require('./assets/sounds/...'))
    Audio.Sound.createAsync(soundKey as any, {
      shouldPlay: true,
      volume: config.sound.volume,
    }).then(({ sound }) => {
      sound.setOnPlaybackStatusUpdate(status => {
        if ((status as any).didJustFinish) sound.unloadAsync();
      });
    }).catch(() => {});
  }, [config.sound]);

  const toggleMute = useCallback(() => setMuted(m => !m), []);

  return { play, muted, toggleMute };
}
