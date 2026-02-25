import type { StatusTranslations } from './types.js'

/** Status translations for Dutch. */
export const nl: StatusTranslations = {
  'status.error.serviceNotFound': 'Service niet gevonden.',
  'status.error.incidentNotFound': 'Incident niet gevonden.',
  'status.error.validationFailed': 'Validatie mislukt: {{errors}}',
  'status.error.createServiceFailed': 'Service aanmaken mislukt.',
  'status.error.updateServiceFailed': 'Service bijwerken mislukt.',
  'status.error.deleteServiceFailed': 'Service verwijderen mislukt.',
  'status.error.getServiceFailed': 'Service ophalen mislukt.',
  'status.error.listServicesFailed': 'Services weergeven mislukt.',
  'status.error.createIncidentFailed': 'Incident aanmaken mislukt.',
  'status.error.updateIncidentFailed': 'Incident bijwerken mislukt.',
  'status.error.listIncidentsFailed': 'Incidenten weergeven mislukt.',
  'status.error.getStatusFailed': 'Systeemstatus ophalen mislukt.',
  'status.error.getUptimeFailed': 'Uptimegegevens ophalen mislukt.',
}
