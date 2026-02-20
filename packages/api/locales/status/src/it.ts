import type { StatusTranslations } from './types.js'

/** Status translations for Italian. */
export const it: StatusTranslations = {
  'status.error.serviceNotFound': 'Servizio non trovato.',
  'status.error.incidentNotFound': 'Incidente non trovato.',
  'status.error.validationFailed': 'Validazione fallita: {{errors}}',
  'status.error.createServiceFailed': 'Impossibile creare il servizio.',
  'status.error.updateServiceFailed': 'Impossibile aggiornare il servizio.',
  'status.error.deleteServiceFailed': 'Impossibile eliminare il servizio.',
  'status.error.getServiceFailed': 'Impossibile recuperare il servizio.',
  'status.error.listServicesFailed': 'Impossibile elencare i servizi.',
  'status.error.createIncidentFailed': "Impossibile creare l'incidente.",
  'status.error.updateIncidentFailed': "Impossibile aggiornare l'incidente.",
  'status.error.listIncidentsFailed': 'Impossibile elencare gli incidenti.',
  'status.error.getStatusFailed': 'Impossibile recuperare lo stato del sistema.',
  'status.error.getUptimeFailed': 'Impossibile recuperare i dati di uptime.',
}
