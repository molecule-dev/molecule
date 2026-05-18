import type { StatusDashboardTranslations } from './types.js'

/** StatusDashboard translations for cs. */
export const cs: Partial<StatusDashboardTranslations> = {
  'statusDashboard.label.degraded': 'Degradovaný',
  'statusDashboard.label.down': 'Nedostupný',
  'statusDashboard.label.services': 'Služby',
  'statusDashboard.label.uptime': 'Dostupnost',
  'statusDashboard.error.noProvider': 'Poskytovatel řídicího panelu stavu není nakonfigurován.',
  'statusDashboard.error.fetchFailed': 'Nepodařilo se načíst stav: HTTP<x> {{postavení}}</x>',
  'statusDashboard.label.allOperational': 'Všechny systémy v provozu',
  'statusDashboard.label.someIssues': 'Některé systémy mají problémy',
  'statusDashboard.label.majorOutage': 'Výpadek velkého systému',
  'statusDashboard.label.operational': 'Provozní',
  'statusDashboard.label.unknown': 'Neznámý',
  'statusDashboard.label.incidents': 'Incidenty',
  'statusDashboard.label.lastChecked': 'Naposledy zkontrolováno<x> {{čas}}</x>',
  'statusDashboard.label.latency': '{{paní}} paní',
  'statusDashboard.label.noIncidents': 'Nebyly hlášeny žádné incidenty.',
}
