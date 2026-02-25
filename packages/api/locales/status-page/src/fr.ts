import type { StatusTranslations } from './types.js'

/** Status translations for French. */
export const fr: StatusTranslations = {
  'status.error.serviceNotFound': 'Service non trouvé.',
  'status.error.incidentNotFound': 'Incident non trouvé.',
  'status.error.validationFailed': 'Validation échouée : {{errors}}',
  'status.error.createServiceFailed': 'Échec de la création du service.',
  'status.error.updateServiceFailed': 'Échec de la mise à jour du service.',
  'status.error.deleteServiceFailed': 'Échec de la suppression du service.',
  'status.error.getServiceFailed': 'Échec de la récupération du service.',
  'status.error.listServicesFailed': 'Échec du listage des services.',
  'status.error.createIncidentFailed': "Échec de la création de l'incident.",
  'status.error.updateIncidentFailed': "Échec de la mise à jour de l'incident.",
  'status.error.listIncidentsFailed': 'Échec du listage des incidents.',
  'status.error.getStatusFailed': 'Échec de la récupération du statut système.',
  'status.error.getUptimeFailed': 'Échec de la récupération des données de disponibilité.',
}
