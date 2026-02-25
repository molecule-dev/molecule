import type { StatusDashboardTranslations } from './types.js'

/** Status dashboard translations for French. */
export const fr: StatusDashboardTranslations = {
  'statusDashboard.error.noProvider':
    "Le fournisseur du tableau de bord d'état n'est pas configuré.",
  'statusDashboard.error.fetchFailed': "Échec de la récupération de l'état : HTTP {{status}}",
  'statusDashboard.label.allOperational': 'Tous les systèmes sont opérationnels',
  'statusDashboard.label.someIssues': 'Certains systèmes rencontrent des problèmes',
  'statusDashboard.label.majorOutage': 'Panne majeure du système',
  'statusDashboard.label.operational': 'Opérationnel',
  'statusDashboard.label.degraded': 'Dégradé',
  'statusDashboard.label.down': 'Hors service',
  'statusDashboard.label.unknown': 'Inconnu',
  'statusDashboard.label.services': 'Services',
  'statusDashboard.label.incidents': 'Incidents',
  'statusDashboard.label.uptime': 'Disponibilité',
  'statusDashboard.label.lastChecked': 'Dernière vérification {{time}}',
  'statusDashboard.label.latency': '{{ms}}ms',
  'statusDashboard.label.noIncidents': 'Aucun incident signalé.',
}
