import type { StatusDashboardTranslations } from './types.js'

/** Status dashboard translations for Czech. */
export const cs: StatusDashboardTranslations = {
  'statusDashboard.error.noProvider': 'Poskytovatel stavového panelu není nakonfigurován.',
  'statusDashboard.error.fetchFailed': 'Nepodařilo se načíst stav: HTTP {{status}}',
  'statusDashboard.label.allOperational': 'Všechny systémy jsou v provozu',
  'statusDashboard.label.someIssues': 'Některé systémy mají problémy',
  'statusDashboard.label.majorOutage': 'Velký výpadek systému',
  'statusDashboard.label.operational': 'V provozu',
  'statusDashboard.label.degraded': 'Zhoršený',
  'statusDashboard.label.down': 'Nefunkční',
  'statusDashboard.label.unknown': 'Neznámý',
  'statusDashboard.label.services': 'Služby',
  'statusDashboard.label.incidents': 'Incidenty',
  'statusDashboard.label.uptime': 'Doba provozu',
  'statusDashboard.label.lastChecked': 'Naposledy zkontrolováno {{time}}',
  'statusDashboard.label.latency': '{{ms}}ms',
  'statusDashboard.label.noIncidents': 'Nebyly hlášeny žádné incidenty.',
}
