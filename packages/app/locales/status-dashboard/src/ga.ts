import type { StatusDashboardTranslations } from './types.js'

/** Status dashboard translations for Irish. */
export const ga: StatusDashboardTranslations = {
  'statusDashboard.error.noProvider': 'Níl soláthraí deais stádais cumraithe.',
  'statusDashboard.error.fetchFailed': 'Theip ar fháil an stádais: HTTP {{status}}',
  'statusDashboard.label.allOperational': 'Gach córas ag feidhmiú',
  'statusDashboard.label.someIssues': 'Tá fadhbanna ag roinnt córas',
  'statusDashboard.label.majorOutage': 'Mórchur isteach córais',
  'statusDashboard.label.operational': 'Ag feidhmiú',
  'statusDashboard.label.degraded': 'Laghdaithe',
  'statusDashboard.label.down': 'As feidhm',
  'statusDashboard.label.unknown': 'Anaithnid',
  'statusDashboard.label.services': 'Seirbhísí',
  'statusDashboard.label.incidents': 'Teagmhais',
  'statusDashboard.label.uptime': 'Am feidhme',
  'statusDashboard.label.lastChecked': 'Seiceáilte go deireanach {{time}}',
  'statusDashboard.label.latency': '{{ms}}ms',
  'statusDashboard.label.noIncidents': 'Níor tuairiscíodh aon teagmhas.',
}
