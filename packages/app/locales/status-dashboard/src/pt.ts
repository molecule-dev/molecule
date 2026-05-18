import type { StatusDashboardTranslations } from './types.js'

/** StatusDashboard translations for pt. */
export const pt: Partial<StatusDashboardTranslations> = {
  'statusDashboard.label.operational': 'Operacional',
  'statusDashboard.label.degraded': 'Degradado',
  'statusDashboard.label.down': 'Fora do ar',
  'statusDashboard.label.unknown': 'Desconhecido',
  'statusDashboard.label.services': 'Serviços',
  'statusDashboard.label.incidents': 'Incidentes',
  'statusDashboard.label.uptime': 'Disponibilidade',
  'statusDashboard.error.noProvider': 'Provedor do painel de status não configurado.',
  'statusDashboard.error.fetchFailed': 'Falha ao obter o status: HTTP<x> {{status}}</x>',
  'statusDashboard.label.allOperational': 'Todos os sistemas operacionais',
  'statusDashboard.label.someIssues': 'Alguns sistemas estão apresentando problemas.',
  'statusDashboard.label.majorOutage': 'Grande interrupção do sistema',
  'statusDashboard.label.lastChecked': 'Última verificação<x> {{tempo}}</x>',
  'statusDashboard.label.latency': '{{EM}} EM',
  'statusDashboard.label.noIncidents': 'Nenhum incidente foi relatado.',
}
