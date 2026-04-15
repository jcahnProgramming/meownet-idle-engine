// ─────────────────────────────────────────────
//  MeowNet Idle Engine — useNotifications hook
//
//  Handles:
//  1. Permission request on first launch
//  2. Re-engagement push (X hours offline)
//  3. Prestige-ready alert
//  4. Daily challenge reset alert
//
//  All notification content is defined in
//  gameConfig.notifications so forks can
//  customize messages per game theme.
// ─────────────────────────────────────────────

import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { GameConfig, GameState } from '../types/engine';

// Configure foreground behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const NOTIF_IDS = {
  reEngagement: 'idle-re-engagement',
  prestigeReady: 'idle-prestige-ready',
  dailyReset: 'idle-daily-reset',
};

async function requestPermissions(): Promise<boolean> {
  if (!Device.isDevice) return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

async function cancelNotif(id: string) {
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {}
}

async function scheduleReEngagement(config: GameConfig) {
  await cancelNotif(NOTIF_IDS.reEngagement);
  const messages = config.notifications.messages.reEngagement;
  const body = messages[Math.floor(Math.random() * messages.length)];
  const hours = config.notifications.reEngagementHours;

  await Notifications.scheduleNotificationAsync({
    identifier: NOTIF_IDS.reEngagement,
    content: {
      title: config.gameName,
      body,
    },
    trigger: {
      seconds: hours * 3600,
      repeats: false,
    } as any,
  });
}

async function schedulePrestigeReady(config: GameConfig, state: GameState) {
  if (!config.notifications.prestigeReadyAlert) return;
  const primaryRes = state.resources[config.prestige.requiredResource] ?? 0;
  const needed = config.prestige.requiredAmount;

  if (primaryRes >= needed) {
    // Already ready — fire immediately
    await Notifications.scheduleNotificationAsync({
      identifier: NOTIF_IDS.prestigeReady,
      content: {
        title: config.gameName,
        body: config.notifications.messages.prestigeReady,
      },
      trigger: null,
    });
  }
}

async function scheduleDailyReset(config: GameConfig) {
  if (!config.notifications.dailyChallengeAlert) return;
  await cancelNotif(NOTIF_IDS.dailyReset);

  // Schedule for midnight tonight
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  const secondsUntilMidnight = Math.floor((midnight.getTime() - now.getTime()) / 1000);

  await Notifications.scheduleNotificationAsync({
    identifier: NOTIF_IDS.dailyReset,
    content: {
      title: config.gameName,
      body: config.notifications.messages.dailyReset,
    },
    trigger: {
      seconds: secondsUntilMidnight,
      repeats: false,
    } as any,
  });
}

interface UseNotificationsOptions {
  config: GameConfig;
  state?: GameState;
}

export function useNotifications({ config, state }: UseNotificationsOptions) {
  const permittedRef = useRef(false);
  const prestigeNotifiedRef = useRef(false);

  // Request permissions on mount
  useEffect(() => {
    if (!config.notifications.enabled) return;
    requestPermissions().then(granted => {
      permittedRef.current = granted;
      if (granted) {
        scheduleReEngagement(config);
        scheduleDailyReset(config);
      }
    });
  }, []);

  // Cancel re-engagement when app comes to foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (status: AppStateStatus) => {
      if (!permittedRef.current) return;
      if (status === 'active') {
        // Back in app — reset the re-engagement timer
        await cancelNotif(NOTIF_IDS.reEngagement);
        scheduleReEngagement(config);
      }
      if (status === 'background') {
        // Going background — arm re-engagement
        scheduleReEngagement(config);
      }
    });
    return () => sub.remove();
  }, [config]);

  // Watch for prestige threshold reached
  useEffect(() => {
    if (!state || !permittedRef.current || prestigeNotifiedRef.current) return;
    const current = state.resources[config.prestige.requiredResource] ?? 0;
    if (current >= config.prestige.requiredAmount) {
      prestigeNotifiedRef.current = true;
      schedulePrestigeReady(config, state);
    }
  }, [state?.resources]);

  // Reset prestige notification flag after prestige
  useEffect(() => {
    if (!state) return;
    if (state.prestige.totalPrestiges > 0) {
      prestigeNotifiedRef.current = false;
    }
  }, [state?.prestige.totalPrestiges]);
}
