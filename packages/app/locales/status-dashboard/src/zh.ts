import type { StatusDashboardTranslations } from './types.js'

/** Status dashboard translations for Chinese Simplified. */
export const zh: StatusDashboardTranslations = {
  'statusDashboard.error.noProvider': '状态仪表板提供程序未配置。',
  'statusDashboard.error.fetchFailed': '获取状态失败: HTTP {{status}}',
  'statusDashboard.label.allOperational': '所有系统运行正常',
  'statusDashboard.label.someIssues': '部分系统出现问题',
  'statusDashboard.label.majorOutage': '重大系统故障',
  'statusDashboard.label.operational': '运行正常',
  'statusDashboard.label.degraded': '性能下降',
  'statusDashboard.label.down': '已停止',
  'statusDashboard.label.unknown': '未知',
  'statusDashboard.label.services': '服务',
  'statusDashboard.label.incidents': '事件',
  'statusDashboard.label.uptime': '运行时间',
  'statusDashboard.label.lastChecked': '最后检查 {{time}}',
  'statusDashboard.label.latency': '{{ms}}ms',
  'statusDashboard.label.noIncidents': '无事件报告。',
}
