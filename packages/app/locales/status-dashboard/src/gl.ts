import type { StatusDashboardTranslations } from './types.js'

/** Status dashboard translations for Galician. */
export const gl: StatusDashboardTranslations = {
  'statusDashboard.error.noProvider': 'O provedor do panel de estado non está configurado.',
  'statusDashboard.error.fetchFailed': 'Erro ao obter o estado: HTTP {{status}}',
  'statusDashboard.label.allOperational': 'Todos os sistemas operativos',
  'statusDashboard.label.someIssues': 'Algúns sistemas están experimentando problemas',
  'statusDashboard.label.majorOutage': 'Interrupción importante do sistema',
  'statusDashboard.label.operational': 'Operativo',
  'statusDashboard.label.degraded': 'Degradado',
  'statusDashboard.label.down': 'Caído',
  'statusDashboard.label.unknown': 'Descoñecido',
  'statusDashboard.label.services': 'Servizos',
  'statusDashboard.label.incidents': 'Incidentes',
  'statusDashboard.label.uptime': 'Tempo de actividade',
  'statusDashboard.label.lastChecked': 'Última comprobación {{time}}',
  'statusDashboard.label.latency': '{{ms}}ms',
  'statusDashboard.label.noIncidents': 'Non se reportaron incidentes.',
}
