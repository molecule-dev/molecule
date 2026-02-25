import type { StatusDashboardTranslations } from './types.js'

/** Status dashboard translations for Japanese. */
export const ja: StatusDashboardTranslations = {
  'statusDashboard.error.noProvider':
    'ステータスダッシュボードのプロバイダーが設定されていません。',
  'statusDashboard.error.fetchFailed': 'ステータスの取得に失敗しました: HTTP {{status}}',
  'statusDashboard.label.allOperational': 'すべてのシステムは正常に稼働中',
  'statusDashboard.label.someIssues': '一部のシステムに問題が発生しています',
  'statusDashboard.label.majorOutage': '重大なシステム障害',
  'statusDashboard.label.operational': '稼働中',
  'statusDashboard.label.degraded': '低下',
  'statusDashboard.label.down': '停止',
  'statusDashboard.label.unknown': '不明',
  'statusDashboard.label.services': 'サービス',
  'statusDashboard.label.incidents': 'インシデント',
  'statusDashboard.label.uptime': '稼働時間',
  'statusDashboard.label.lastChecked': '最終確認 {{time}}',
  'statusDashboard.label.latency': '{{ms}}ms',
  'statusDashboard.label.noIncidents': 'インシデントは報告されていません。',
}
