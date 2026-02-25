import type { StatusDashboardTranslations } from './types.js'

/** Status dashboard translations for Chinese (Traditional). */
export const zhTW: StatusDashboardTranslations = {
  'statusDashboard.error.noProvider': '狀態儀表板提供程式未配置。',
  'statusDashboard.error.fetchFailed': '取得狀態失敗: HTTP {{status}}',
  'statusDashboard.label.allOperational': '所有系統運作正常',
  'statusDashboard.label.someIssues': '部分系統出現問題',
  'statusDashboard.label.majorOutage': '重大系統故障',
  'statusDashboard.label.operational': '運作正常',
  'statusDashboard.label.degraded': '效能降低',
  'statusDashboard.label.down': '已停止',
  'statusDashboard.label.unknown': '未知',
  'statusDashboard.label.services': '服務',
  'statusDashboard.label.incidents': '事件',
  'statusDashboard.label.uptime': '運行時間',
  'statusDashboard.label.lastChecked': '最後檢查 {{time}}',
  'statusDashboard.label.latency': '{{ms}}ms',
  'statusDashboard.label.noIncidents': '無事件報告。',
}
