import type { StatusTranslations } from './types.js'

/** Status translations for Catalan. */
export const ca: StatusTranslations = {
  'status.error.serviceNotFound': 'Servei no trobat.',
  'status.error.incidentNotFound': 'Incident no trobat.',
  'status.error.validationFailed': 'Validació fallida: {{errors}}',
  'status.error.createServiceFailed': "No s'ha pogut crear el servei.",
  'status.error.updateServiceFailed': "No s'ha pogut actualitzar el servei.",
  'status.error.deleteServiceFailed': "No s'ha pogut eliminar el servei.",
  'status.error.getServiceFailed': "No s'ha pogut obtenir el servei.",
  'status.error.listServicesFailed': "No s'han pogut llistar els serveis.",
  'status.error.createIncidentFailed': "No s'ha pogut crear l'incident.",
  'status.error.updateIncidentFailed': "No s'ha pogut actualitzar l'incident.",
  'status.error.listIncidentsFailed': "No s'han pogut llistar els incidents.",
  'status.error.getStatusFailed': "No s'ha pogut obtenir l'estat del sistema.",
  'status.error.getUptimeFailed': "No s'han pogut obtenir les dades de disponibilitat.",
}
