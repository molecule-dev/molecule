import type { StatusDashboardTranslations } from './types.js'

/** StatusDashboard translations for fr. */
export const fr: Partial<StatusDashboardTranslations> = {
  'statusDashboard.label.operational': 'Opérationnel',
  'statusDashboard.label.degraded': 'Dégradé',
  'statusDashboard.label.down': 'Hors ligne',
  'statusDashboard.label.unknown': 'Inconnu',
  'statusDashboard.label.uptime': 'Disponibilité',
  'statusDashboard.error.fetchFailed': 'Échec de la récupération du statut : HTTP {{status}}',
  'statusDashboard.label.allOperational': 'Tous les systèmes sont opérationnels',
  'statusDashboard.label.someIssues': 'Certains systèmes rencontrent des problèmes',
  'statusDashboard.label.majorOutage': 'Panne majeure du système',
  'statusDashboard.label.services': 'Services',
  'statusDashboard.label.incidents': 'Incidents',
  'statusDashboard.label.lastChecked': 'Dernière vérification {{time}}',
  'statusDashboard.label.latency': '{{ms}} MS',
  'statusDashboard.label.noIncidents': "Aucun incident n'a été signalé.",
  'statusDashboard.error.noProvider':
    "Le fournisseur de tableau de bord d'état n'est pas configuré. Veuillez d'abord associer un fournisseur de tableau de bord d'état.",
}
