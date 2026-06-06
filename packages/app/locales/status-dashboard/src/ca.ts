import type { StatusDashboardTranslations } from './types.js'

/** StatusDashboard translations for ca. */
export const ca: Partial<StatusDashboardTranslations> = {
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
  'statusDashboard.error.noProvider': "Proveïdor del tauler de control d'estat no configurat.",
  'statusDashboard.error.fetchFailed': "No s'ha pogut obtenir l'estat: HTTP<x> {{estat}}</x>",
  'statusDashboard.label.noIncidents': "No s'han reportat incidents.",
}
