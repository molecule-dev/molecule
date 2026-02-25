import type { StatusDashboardTranslations } from './types.js'

/** Status dashboard translations for Hungarian. */
export const hu: StatusDashboardTranslations = {
  'statusDashboard.error.noProvider': 'Az állapot irányítópult szolgáltatója nincs beállítva.',
  'statusDashboard.error.fetchFailed': 'Nem sikerült lekérni az állapotot: HTTP {{status}}',
  'statusDashboard.label.allOperational': 'Minden rendszer működik',
  'statusDashboard.label.someIssues': 'Néhány rendszer problémákat tapasztal',
  'statusDashboard.label.majorOutage': 'Jelentős rendszerkimaradás',
  'statusDashboard.label.operational': 'Működik',
  'statusDashboard.label.degraded': 'Csökkent teljesítmény',
  'statusDashboard.label.down': 'Leállt',
  'statusDashboard.label.unknown': 'Ismeretlen',
  'statusDashboard.label.services': 'Szolgáltatások',
  'statusDashboard.label.incidents': 'Incidensek',
  'statusDashboard.label.uptime': 'Üzemidő',
  'statusDashboard.label.lastChecked': 'Utoljára ellenőrizve {{time}}',
  'statusDashboard.label.latency': '{{ms}}ms',
  'statusDashboard.label.noIncidents': 'Nincsenek jelentett incidensek.',
}
