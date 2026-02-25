import type { StatusDashboardTranslations } from './types.js'

/** Status dashboard translations for Catalan. */
export const ca: StatusDashboardTranslations = {
  'statusDashboard.error.noProvider': "El proveïdor del tauler d'estat no està configurat.",
  'statusDashboard.error.fetchFailed': "No s'ha pogut obtenir l'estat: HTTP {{status}}",
  'statusDashboard.label.allOperational': 'Tots els sistemes operatius',
  'statusDashboard.label.someIssues': 'Alguns sistemes tenen problemes',
  'statusDashboard.label.majorOutage': 'Interrupció important del sistema',
  'statusDashboard.label.operational': 'Operatiu',
  'statusDashboard.label.degraded': 'Degradat',
  'statusDashboard.label.down': 'Fora de servei',
  'statusDashboard.label.unknown': 'Desconegut',
  'statusDashboard.label.services': 'Serveis',
  'statusDashboard.label.incidents': 'Incidències',
  'statusDashboard.label.uptime': 'Temps de funcionament',
  'statusDashboard.label.lastChecked': 'Última comprovació {{time}}',
  'statusDashboard.label.latency': '{{ms}}ms',
  'statusDashboard.label.noIncidents': "No s'han reportat incidències.",
}
