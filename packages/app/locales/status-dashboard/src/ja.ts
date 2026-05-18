import type { StatusDashboardTranslations } from './types.js'

/** StatusDashboard translations for ja. */
export const ja: Partial<StatusDashboardTranslations> = {
  'statusDashboard.label.operational': '正常稼働',
  'statusDashboard.label.degraded': '性能低下',
  'statusDashboard.label.down': 'ダウン',
  'statusDashboard.label.unknown': '不明',
  'statusDashboard.label.services': 'サービス',
  'statusDashboard.label.incidents': 'インシデント',
  'statusDashboard.label.uptime': '稼働率',
  'statusDashboard.error.noProvider': 'ステータスダッシュボードプロバイダーが設定されていません。',
  'statusDashboard.error.fetchFailed': 'ステータスの取得に失敗しました: HTTP<x> {{状態}}</x>',
  'statusDashboard.label.allOperational': '全システム稼働中',
  'statusDashboard.label.someIssues': '一部のシステムで問題が発生しています',
  'statusDashboard.label.majorOutage': '大規模システム障害',
  'statusDashboard.label.lastChecked': '最終確認{{時間}}',
  'statusDashboard.label.latency': '{{MS}} MS',
  'statusDashboard.label.noIncidents': '事件の報告はありません。',
}
