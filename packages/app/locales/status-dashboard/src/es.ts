import type { StatusDashboardTranslations } from './types.js'

/** Status dashboard translations for Spanish. */
export const es: StatusDashboardTranslations = {
  'statusDashboard.error.noProvider': 'El proveedor del panel de estado no está configurado.',
  'statusDashboard.error.fetchFailed': 'Error al obtener el estado: HTTP {{status}}',
  'statusDashboard.label.allOperational': 'Todos los sistemas operativos',
  'statusDashboard.label.someIssues': 'Algunos sistemas experimentan problemas',
  'statusDashboard.label.majorOutage': 'Interrupción importante del sistema',
  'statusDashboard.label.operational': 'Operativo',
  'statusDashboard.label.degraded': 'Degradado',
  'statusDashboard.label.down': 'Caído',
  'statusDashboard.label.unknown': 'Desconocido',
  'statusDashboard.label.services': 'Servicios',
  'statusDashboard.label.incidents': 'Incidentes',
  'statusDashboard.label.uptime': 'Tiempo de actividad',
  'statusDashboard.label.lastChecked': 'Última comprobación {{time}}',
  'statusDashboard.label.latency': '{{ms}}ms',
  'statusDashboard.label.noIncidents': 'No se han reportado incidentes.',
}
