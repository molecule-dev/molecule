import type { StatusDashboardTranslations } from './types.js'

/** Status dashboard translations for Romanian. */
export const ro: StatusDashboardTranslations = {
  'statusDashboard.error.noProvider': 'Furnizorul panoului de stare nu este configurat.',
  'statusDashboard.error.fetchFailed': 'Nu s-a putut obține starea: HTTP {{status}}',
  'statusDashboard.label.allOperational': 'Toate sistemele sunt operaționale',
  'statusDashboard.label.someIssues': 'Unele sisteme au probleme',
  'statusDashboard.label.majorOutage': 'Întrerupere majoră a sistemului',
  'statusDashboard.label.operational': 'Operațional',
  'statusDashboard.label.degraded': 'Degradat',
  'statusDashboard.label.down': 'Indisponibil',
  'statusDashboard.label.unknown': 'Necunoscut',
  'statusDashboard.label.services': 'Servicii',
  'statusDashboard.label.incidents': 'Incidente',
  'statusDashboard.label.uptime': 'Timp de funcționare',
  'statusDashboard.label.lastChecked': 'Ultima verificare {{time}}',
  'statusDashboard.label.latency': '{{ms}}ms',
  'statusDashboard.label.noIncidents': 'Niciun incident raportat.',
}
