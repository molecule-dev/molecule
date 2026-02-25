import type { StatusDashboardTranslations } from './types.js'

/** Status dashboard translations for Portuguese. */
export const pt: StatusDashboardTranslations = {
  'statusDashboard.error.noProvider': 'O provedor do painel de status não está configurado.',
  'statusDashboard.error.fetchFailed': 'Falha ao obter o status: HTTP {{status}}',
  'statusDashboard.label.allOperational': 'Todos os sistemas estão operacionais',
  'statusDashboard.label.someIssues': 'Alguns sistemas estão com problemas',
  'statusDashboard.label.majorOutage': 'Interrupção grave do sistema',
  'statusDashboard.label.operational': 'Operacional',
  'statusDashboard.label.degraded': 'Degradado',
  'statusDashboard.label.down': 'Fora do ar',
  'statusDashboard.label.unknown': 'Desconhecido',
  'statusDashboard.label.services': 'Serviços',
  'statusDashboard.label.incidents': 'Incidentes',
  'statusDashboard.label.uptime': 'Tempo de atividade',
  'statusDashboard.label.lastChecked': 'Última verificação {{time}}',
  'statusDashboard.label.latency': '{{ms}}ms',
  'statusDashboard.label.noIncidents': 'Nenhum incidente reportado.',
}
