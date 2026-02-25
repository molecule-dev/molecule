import type { StatusDashboardTranslations } from './types.js'

/** Status dashboard translations for Slovak. */
export const sk: StatusDashboardTranslations = {
  'statusDashboard.error.noProvider': 'Poskytovateľ stavového panelu nie je nakonfigurovaný.',
  'statusDashboard.error.fetchFailed': 'Nepodarilo sa načítať stav: HTTP {{status}}',
  'statusDashboard.label.allOperational': 'Všetky systémy sú v prevádzke',
  'statusDashboard.label.someIssues': 'Niektoré systémy majú problémy',
  'statusDashboard.label.majorOutage': 'Veľký výpadok systému',
  'statusDashboard.label.operational': 'V prevádzke',
  'statusDashboard.label.degraded': 'Zhoršený',
  'statusDashboard.label.down': 'Nefunkčný',
  'statusDashboard.label.unknown': 'Neznámy',
  'statusDashboard.label.services': 'Služby',
  'statusDashboard.label.incidents': 'Incidenty',
  'statusDashboard.label.uptime': 'Doba prevádzky',
  'statusDashboard.label.lastChecked': 'Naposledy skontrolované {{time}}',
  'statusDashboard.label.latency': '{{ms}}ms',
  'statusDashboard.label.noIncidents': 'Žiadne incidenty neboli nahlásené.',
}
