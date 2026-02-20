import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Japanese. */
export const ja: MonitoringTranslations = {
  'monitoring.error.noProvider':
    'モニタリングプロバイダーが設定されていません。先にsetProvider()を呼び出してください。',
  'monitoring.check.database.notBonded': 'データベースボンドが設定されていません。',
  'monitoring.check.database.poolUnavailable': 'データベースプールが利用できません。',
  'monitoring.check.cache.notBonded': 'キャッシュボンドが設定されていません。',
  'monitoring.check.cache.providerUnavailable': 'キャッシュプロバイダーが利用できません。',
  'monitoring.check.http.badStatus': 'HTTP {{status}} レスポンス。',
  'monitoring.check.http.timeout': 'リクエストがタイムアウトしました。',
  'monitoring.check.http.degraded':
    '応答時間{{latencyMs}}msがしきい値{{thresholdMs}}msを超えました。',
  'monitoring.check.bond.notBonded': "ボンド '{{bondType}}' は登録されていません。",
  'monitoring.check.timedOut': 'チェックが{{timeoutMs}}ms後にタイムアウトしました。',
}
