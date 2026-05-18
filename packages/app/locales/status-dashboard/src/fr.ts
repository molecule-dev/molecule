import type { StatusDashboardTranslations } from './types.js'

/** StatusDashboard translations for fr. */
export const fr: Partial<StatusDashboardTranslations> = {
  'statusDashboard.label.operational': 'Opérationnel',
  'statusDashboard.label.degraded': 'Dégradé',
  'statusDashboard.label.down': 'Hors ligne',
  'statusDashboard.label.unknown': 'Inconnu',
  'statusDashboard.label.uptime': 'Disponibilité',
  'statusDashboard.error.noProvider':
    'Le fournisseur du tableau de bord d&#39;état n&#39;est pas configuré.',
  'statusDashboard.error.fetchFailed':
    'Échec de la récupération du statut : HTTP<x> {{statut}}</x>',
  'statusDashboard.label.allOperational': 'Tous les systèmes sont opérationnels',
  'statusDashboard.label.someIssues': 'Certains systèmes rencontrent des problèmes',
  'statusDashboard.label.majorOutage': 'Panne majeure du système',
  'statusDashboard.label.services': 'Services',
  'statusDashboard.label.incidents': 'Incidents',
  'statusDashboard.label.lastChecked': 'Dernière vérification<x> {{temps}}</x>',
  'statusDashboard.label.latency': '{{MS}} MS',
  'statusDashboard.label.noIncidents': 'Aucun incident n&#39;a été signalé.',
}
