// ─────────────────────────────────────────────
//  MeowNet Idle Engine — i18n / Localization
//
//  All UI strings go through t() so forks can
//  add any language by adding a locale entry.
//
//  Usage:
//    import { t } from '../engine/i18n';
//    t('tap_button')  // → "Tap!"
//
//  To add a language, add a key to LOCALES and
//  set locale via setLocale('fr') at startup.
//
//  Config override: gameConfig.locale = 'fr'
// ─────────────────────────────────────────────

export type LocaleKey =
  | 'tap_button'
  | 'buildings_tab'
  | 'upgrades_tab'
  | 'prestige_button'
  | 'prestige_ready'
  | 'offline_title'
  | 'offline_subtitle'
  | 'offline_collect'
  | 'offline_rate_note'
  | 'achievement_unlocked'
  | 'leaderboard_title'
  | 'leaderboard_empty'
  | 'leaderboard_refresh'
  | 'settings_title'
  | 'settings_account'
  | 'settings_stats'
  | 'settings_prestige'
  | 'settings_danger'
  | 'settings_reset'
  | 'settings_sound'
  | 'settings_notifications'
  | 'settings_sound_on'
  | 'settings_sound_off'
  | 'settings_notif_on'
  | 'settings_notif_off'
  | 'daily_title'
  | 'daily_resets_in'
  | 'daily_claim'
  | 'daily_completed'
  | 'stats_title'
  | 'prestige_shop_title'
  | 'prestige_shop_subtitle'
  | 'prestige_shop_maxed'
  | 'buy_max'
  | 'save_sync_cloud'
  | 'save_sync_local'
  | 'loading';

type LocaleMap = Record<LocaleKey, string>;

const LOCALES: Record<string, LocaleMap> = {
  en: {
    tap_button: 'Tap!',
    buildings_tab: '🏗 Buildings',
    upgrades_tab: '⚡ Upgrades',
    prestige_button: 'Prestige — Reset for bonus!',
    prestige_ready: 'Ready to Prestige!',
    offline_title: 'Welcome Back!',
    offline_subtitle: 'You were away for {duration}',
    offline_collect: 'Collect!',
    offline_rate_note: 'Earned at {rate}% offline rate',
    achievement_unlocked: 'Achievement Unlocked!',
    leaderboard_title: 'Leaderboard',
    leaderboard_empty: 'No scores yet. Be the first!',
    leaderboard_refresh: '↻ Refresh',
    settings_title: 'Settings',
    settings_account: 'Account',
    settings_stats: 'Stats',
    settings_prestige: 'Prestige',
    settings_danger: 'Danger Zone',
    settings_reset: 'Reset Save Data',
    settings_sound: 'Sound',
    settings_notifications: 'Notifications',
    settings_sound_on: '🔊 On',
    settings_sound_off: '🔇 Muted',
    settings_notif_on: '🔔 On',
    settings_notif_off: '🔕 Off',
    daily_title: 'Daily Challenges',
    daily_resets_in: 'Resets in {time}',
    daily_claim: 'Claim Reward',
    daily_completed: 'Completed!',
    stats_title: 'Statistics',
    prestige_shop_title: 'Shop',
    prestige_shop_subtitle: 'Permanent upgrades that survive every prestige',
    prestige_shop_maxed: 'MAX',
    buy_max: 'Max',
    save_sync_cloud: '☁️ Cloud',
    save_sync_local: '📱 Local only',
    loading: 'Loading...',
  },

  es: {
    tap_button: '¡Toca!',
    buildings_tab: '🏗 Edificios',
    upgrades_tab: '⚡ Mejoras',
    prestige_button: 'Prestigio — ¡Reinicia por bonus!',
    prestige_ready: '¡Listo para Prestigio!',
    offline_title: '¡Bienvenido de nuevo!',
    offline_subtitle: 'Estuviste fuera por {duration}',
    offline_collect: '¡Recoger!',
    offline_rate_note: 'Ganado al {rate}% de tasa offline',
    achievement_unlocked: '¡Logro Desbloqueado!',
    leaderboard_title: 'Clasificación',
    leaderboard_empty: 'Sin puntuaciones aún. ¡Sé el primero!',
    leaderboard_refresh: '↻ Actualizar',
    settings_title: 'Ajustes',
    settings_account: 'Cuenta',
    settings_stats: 'Estadísticas',
    settings_prestige: 'Prestigio',
    settings_danger: 'Zona de Peligro',
    settings_reset: 'Reiniciar Partida',
    settings_sound: 'Sonido',
    settings_notifications: 'Notificaciones',
    settings_sound_on: '🔊 Activado',
    settings_sound_off: '🔇 Silenciado',
    settings_notif_on: '🔔 Activado',
    settings_notif_off: '🔕 Desactivado',
    daily_title: 'Desafíos Diarios',
    daily_resets_in: 'Reinicia en {time}',
    daily_claim: 'Reclamar Premio',
    daily_completed: '¡Completado!',
    stats_title: 'Estadísticas',
    prestige_shop_title: 'Tienda',
    prestige_shop_subtitle: 'Mejoras permanentes que sobreviven al prestigio',
    prestige_shop_maxed: 'MÁX',
    buy_max: 'Máx',
    save_sync_cloud: '☁️ Nube',
    save_sync_local: '📱 Solo local',
    loading: 'Cargando...',
  },

  fr: {
    tap_button: 'Taper!',
    buildings_tab: '🏗 Bâtiments',
    upgrades_tab: '⚡ Améliorations',
    prestige_button: 'Prestige — Réinitialiser pour un bonus!',
    prestige_ready: 'Prêt pour le Prestige!',
    offline_title: 'Bienvenue!',
    offline_subtitle: 'Vous étiez absent(e) pendant {duration}',
    offline_collect: 'Collecter!',
    offline_rate_note: 'Gagné à {rate}% du taux hors ligne',
    achievement_unlocked: 'Succès Débloqué!',
    leaderboard_title: 'Classement',
    leaderboard_empty: 'Pas encore de scores. Soyez le premier!',
    leaderboard_refresh: '↻ Actualiser',
    settings_title: 'Paramètres',
    settings_account: 'Compte',
    settings_stats: 'Statistiques',
    settings_prestige: 'Prestige',
    settings_danger: 'Zone Dangereuse',
    settings_reset: 'Réinitialiser la Sauvegarde',
    settings_sound: 'Son',
    settings_notifications: 'Notifications',
    settings_sound_on: '🔊 Activé',
    settings_sound_off: '🔇 Muet',
    settings_notif_on: '🔔 Activé',
    settings_notif_off: '🔕 Désactivé',
    daily_title: 'Défis Quotidiens',
    daily_resets_in: 'Réinitialise dans {time}',
    daily_claim: 'Réclamer la Récompense',
    daily_completed: 'Terminé!',
    stats_title: 'Statistiques',
    prestige_shop_title: 'Boutique',
    prestige_shop_subtitle: 'Améliorations permanentes qui survivent au prestige',
    prestige_shop_maxed: 'MAX',
    buy_max: 'Max',
    save_sync_cloud: '☁️ Cloud',
    save_sync_local: '📱 Local uniquement',
    loading: 'Chargement...',
  },

  ja: {
    tap_button: 'タップ!',
    buildings_tab: '🏗 建物',
    upgrades_tab: '⚡ アップグレード',
    prestige_button: 'プレステージ — リセットしてボーナス!',
    prestige_ready: 'プレステージ準備完了!',
    offline_title: 'おかえりなさい!',
    offline_subtitle: '{duration}間離れていました',
    offline_collect: '受け取る!',
    offline_rate_note: 'オフラインレート{rate}%で獲得',
    achievement_unlocked: '実績解除!',
    leaderboard_title: 'ランキング',
    leaderboard_empty: 'まだスコアがありません。最初になろう!',
    leaderboard_refresh: '↻ 更新',
    settings_title: '設定',
    settings_account: 'アカウント',
    settings_stats: '統計',
    settings_prestige: 'プレステージ',
    settings_danger: '危険ゾーン',
    settings_reset: 'セーブデータをリセット',
    settings_sound: 'サウンド',
    settings_notifications: '通知',
    settings_sound_on: '🔊 オン',
    settings_sound_off: '🔇 ミュート',
    settings_notif_on: '🔔 オン',
    settings_notif_off: '🔕 オフ',
    daily_title: 'デイリーチャレンジ',
    daily_resets_in: '{time}でリセット',
    daily_claim: '報酬を受け取る',
    daily_completed: '完了!',
    stats_title: '統計',
    prestige_shop_title: 'ショップ',
    prestige_shop_subtitle: 'プレステージを超えて残る永久アップグレード',
    prestige_shop_maxed: 'MAX',
    buy_max: '最大',
    save_sync_cloud: '☁️ クラウド',
    save_sync_local: '📱 ローカルのみ',
    loading: '読み込み中...',
  },
};

// ── Runtime locale state ─────────────────────
let _locale = 'en';

export function setLocale(locale: string) {
  if (LOCALES[locale]) _locale = locale;
  else console.warn(`[i18n] Unknown locale: ${locale}, falling back to 'en'`);
}

export function getLocale(): string {
  return _locale;
}

export function getSupportedLocales(): string[] {
  return Object.keys(LOCALES);
}

// ── Main translate function ──────────────────
export function t(key: LocaleKey, vars?: Record<string, string | number>): string {
  const map = LOCALES[_locale] ?? LOCALES.en;
  let str = map[key] ?? LOCALES.en[key] ?? key;

  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(`{${k}}`, String(v));
    }
  }

  return str;
}
