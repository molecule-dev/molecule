import type { StatusDashboardTranslations } from './types.js'

/** StatusDashboard translations for cy. */
export const cy: Partial<StatusDashboardTranslations> = {
  'statusDashboard.error.fetchFailed': 'Methwyd â nôl y statws: HTTP {{status}}',
  'statusDashboard.label.majorOutage': 'Methiant system mawr',
  'statusDashboard.label.operational': 'Yn gweithredu',
  'statusDashboard.label.degraded': 'Dirywiad',
  'statusDashboard.label.down': 'I lawr',
  'statusDashboard.label.unknown': 'Anhysbys',
  'statusDashboard.label.services': 'Gwasanaethau',
  'statusDashboard.label.incidents': 'Digwyddiadau',
  'statusDashboard.label.uptime': 'Amser rhedeg',
  'statusDashboard.label.lastChecked': 'Gwiriwyd ddiwethaf {{time}}',
  'statusDashboard.label.latency': '{{ms}}ms',
  'statusDashboard.label.noIncidents': 'Ni adroddwyd am unrhyw ddigwyddiadau.',
  'statusDashboard.label.allOperational': 'Pob System yn Weithredol',
  'statusDashboard.label.someIssues': 'Rhai Systemau yn Profi Problemau',
  'statusDashboard.error.noProvider':
    'Darparwr dangosfwrdd statws heb ei ffurfweddu. Cysylltwch ddarparwr dangosfwrdd statws yn gyntaf.',
}
