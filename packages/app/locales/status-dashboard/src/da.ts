import type { StatusDashboardTranslations } from './types.js'

/** StatusDashboard translations for da. */
export const da: Partial<StatusDashboardTranslations> = {
  'statusDashboard.label.degraded': 'Forringet',
  'statusDashboard.label.down': 'Nede',
  'statusDashboard.label.services': 'Tjenester',
  'statusDashboard.label.uptime': 'Oppetid',
  'statusDashboard.error.noProvider': 'Statusdashboardudbyder er ikke konfigureret.',
  'statusDashboard.error.fetchFailed': 'Status mislykkedes med at hente: HTTP<x> {{status}}</x>',
  'statusDashboard.label.allOperational': 'Alle systemer i drift',
  'statusDashboard.label.someIssues': 'Nogle systemer oplever problemer',
  'statusDashboard.label.majorOutage': 'Stort systemafbrydelse',
  'statusDashboard.label.operational': 'Operationel',
  'statusDashboard.label.unknown': 'Ukendt',
  'statusDashboard.label.incidents': 'Hændelser',
  'statusDashboard.label.lastChecked': 'Sidst kontrolleret<x> {{tid}}</x>',
  'statusDashboard.label.latency': '{{ms}} ms',
  'statusDashboard.label.noIncidents': 'Ingen rapporterede hændelser.',
}
