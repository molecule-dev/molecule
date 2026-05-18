import type { StatusDashboardTranslations } from './types.js'

/** StatusDashboard translations for it. */
export const it: Partial<StatusDashboardTranslations> = {
  'statusDashboard.label.operational': 'Operativo',
  'statusDashboard.label.degraded': 'Degradato',
  'statusDashboard.label.down': 'Inattivo',
  'statusDashboard.label.unknown': 'Sconosciuto',
  'statusDashboard.label.services': 'Servizi',
  'statusDashboard.label.incidents': 'Incidenti',
  'statusDashboard.label.uptime': 'Tempo di attività',
  'statusDashboard.error.noProvider':
    'Provider del pannello di controllo dello stato non configurato.',
  'statusDashboard.error.fetchFailed': 'Impossibile recuperare lo stato: HTTP<x> {{stato}}</x>',
  'statusDashboard.label.allOperational': 'Tutti i sistemi sono operativi',
  'statusDashboard.label.someIssues': 'Alcuni sistemi stanno riscontrando problemi',
  'statusDashboard.label.majorOutage': 'Interruzione di sistema di grave entità',
  'statusDashboard.label.lastChecked': 'Ultimo controllo<x> {{tempo}}</x>',
  'statusDashboard.label.latency': '{{SM}} SM',
  'statusDashboard.label.noIncidents': 'Nessun incidente segnalato.',
}
