import type { StatusDashboardTranslations } from './types.js'

/** StatusDashboard translations for zh. */
export const zh: Partial<StatusDashboardTranslations> = {
  'statusDashboard.label.operational': '正常运行',
  'statusDashboard.label.degraded': '降级',
  'statusDashboard.label.down': '宕机',
  'statusDashboard.label.unknown': '未知',
  'statusDashboard.label.services': '服务',
  'statusDashboard.label.incidents': '事件',
  'statusDashboard.label.uptime': '可用率',
  'statusDashboard.error.noProvider': '状态仪表盘提供程序未配置。',
  'statusDashboard.error.fetchFailed': '获取状态失败：HTTP<x> {{地位}}</x>',
  'statusDashboard.label.allOperational': '所有系统运行正常',
  'statusDashboard.label.someIssues': '部分系统出现问题',
  'statusDashboard.label.majorOutage': '重大系统故障',
  'statusDashboard.label.lastChecked': '上次检查时间{{时间}}',
  'statusDashboard.label.latency': '{{多发性硬化症}}多发性硬化症',
  'statusDashboard.label.noIncidents': '未报告任何事件。',
}
