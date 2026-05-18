import type { StatusDashboardTranslations } from './types.js'

/** StatusDashboard translations for hu. */
export const hu: Partial<StatusDashboardTranslations> = {
  'statusDashboard.label.degraded': 'Leromlott',
  'statusDashboard.label.down': 'Leállt',
  'statusDashboard.label.services': 'Szolgáltatások',
  'statusDashboard.label.uptime': 'Üzemidő',
  'statusDashboard.error.noProvider': 'Az állapotjelző műszerfal szolgáltatója nincs konfigurálva.',
  'statusDashboard.error.fetchFailed': 'Nem sikerült lekérni az állapotot: HTTP<x> {{állapot}}</x>',
  'statusDashboard.label.allOperational': 'Minden rendszer működőképes',
  'statusDashboard.label.someIssues': 'Néhány rendszer problémákat tapasztal',
  'statusDashboard.label.majorOutage': 'Súlyos rendszerkiesés',
  'statusDashboard.label.operational': 'Működési',
  'statusDashboard.label.unknown': 'Ismeretlen',
  'statusDashboard.label.incidents': 'Események',
  'statusDashboard.label.lastChecked': 'Utolsó ellenőrzés<x> {{idő}}</x>',
  'statusDashboard.label.latency': '{{ms}} kisasszony',
  'statusDashboard.label.noIncidents': 'Nem jelentettek incidenseket.',
}
