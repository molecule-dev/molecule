import type { StatusDashboardTranslations } from './types.js'

/** StatusDashboard translations for es. */
export const es: Partial<StatusDashboardTranslations> = {
  'statusDashboard.label.operational': 'Operativo',
  'statusDashboard.label.degraded': 'Degradado',
  'statusDashboard.label.down': 'Caído',
  'statusDashboard.label.unknown': 'Desconocido',
  'statusDashboard.label.services': 'Servicios',
  'statusDashboard.label.incidents': 'Incidentes',
  'statusDashboard.label.uptime': 'Disponibilidad',
  'statusDashboard.error.noProvider': 'El proveedor del panel de estado no está configurado.',
  'statusDashboard.error.fetchFailed': 'No se pudo obtener el estado: HTTP<x> {{estado}}</x>',
  'statusDashboard.label.allOperational': 'Todos los sistemas están operativos.',
  'statusDashboard.label.someIssues': 'Algunos sistemas están experimentando problemas.',
  'statusDashboard.label.majorOutage': 'Interrupción importante del sistema',
  'statusDashboard.label.lastChecked': 'Última comprobación<x> {{tiempo}}</x>',
  'statusDashboard.label.latency': '{{EM}} EM',
  'statusDashboard.label.noIncidents': 'No se han reportado incidentes.',
}
