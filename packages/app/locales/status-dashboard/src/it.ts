import type { StatusDashboardTranslations } from './types.js'

/** Status dashboard translations for Italian. */
export const it: StatusDashboardTranslations = {
  'statusDashboard.error.noProvider': 'Il provider della dashboard di stato non è configurato.',
  'statusDashboard.error.fetchFailed': 'Impossibile recuperare lo stato: HTTP {{status}}',
  'statusDashboard.label.allOperational': 'Tutti i sistemi sono operativi',
  'statusDashboard.label.someIssues': 'Alcuni sistemi stanno riscontrando problemi',
  'statusDashboard.label.majorOutage': 'Interruzione importante del sistema',
  'statusDashboard.label.operational': 'Operativo',
  'statusDashboard.label.degraded': 'Degradato',
  'statusDashboard.label.down': 'Non funzionante',
  'statusDashboard.label.unknown': 'Sconosciuto',
  'statusDashboard.label.services': 'Servizi',
  'statusDashboard.label.incidents': 'Incidenti',
  'statusDashboard.label.uptime': 'Tempo di attività',
  'statusDashboard.label.lastChecked': 'Ultimo controllo {{time}}',
  'statusDashboard.label.latency': '{{ms}}ms',
  'statusDashboard.label.noIncidents': 'Nessun incidente segnalato.',
}
