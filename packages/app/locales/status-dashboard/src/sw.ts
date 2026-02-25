import type { StatusDashboardTranslations } from './types.js'

/** Status dashboard translations for Swahili. */
export const sw: StatusDashboardTranslations = {
  'statusDashboard.error.noProvider': 'Mtoa huduma wa dashibodi ya hali haijasanidiwa.',
  'statusDashboard.error.fetchFailed': 'Imeshindwa kupata hali: HTTP {{status}}',
  'statusDashboard.label.allOperational': 'Mifumo yote inafanya kazi',
  'statusDashboard.label.someIssues': 'Mifumo mingine inakabiliwa na matatizo',
  'statusDashboard.label.majorOutage': 'Kukatika kwa mfumo mkubwa',
  'statusDashboard.label.operational': 'Inafanya kazi',
  'statusDashboard.label.degraded': 'Imepungua',
  'statusDashboard.label.down': 'Haifanyi kazi',
  'statusDashboard.label.unknown': 'Haijulikani',
  'statusDashboard.label.services': 'Huduma',
  'statusDashboard.label.incidents': 'Matukio',
  'statusDashboard.label.uptime': 'Muda wa kufanya kazi',
  'statusDashboard.label.lastChecked': 'Imeangaliwa mwisho {{time}}',
  'statusDashboard.label.latency': '{{ms}}ms',
  'statusDashboard.label.noIncidents': 'Hakuna matukio yaliyoripotiwa.',
}
