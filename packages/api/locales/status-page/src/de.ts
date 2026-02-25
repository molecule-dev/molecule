import type { StatusTranslations } from './types.js'

/** Status translations for German. */
export const de: StatusTranslations = {
  'status.error.serviceNotFound': 'Dienst nicht gefunden.',
  'status.error.incidentNotFound': 'Vorfall nicht gefunden.',
  'status.error.validationFailed': 'Validierung fehlgeschlagen: {{errors}}',
  'status.error.createServiceFailed': 'Dienst konnte nicht erstellt werden.',
  'status.error.updateServiceFailed': 'Dienst konnte nicht aktualisiert werden.',
  'status.error.deleteServiceFailed': 'Dienst konnte nicht gelöscht werden.',
  'status.error.getServiceFailed': 'Dienst konnte nicht abgerufen werden.',
  'status.error.listServicesFailed': 'Dienste konnten nicht aufgelistet werden.',
  'status.error.createIncidentFailed': 'Vorfall konnte nicht erstellt werden.',
  'status.error.updateIncidentFailed': 'Vorfall konnte nicht aktualisiert werden.',
  'status.error.listIncidentsFailed': 'Vorfälle konnten nicht aufgelistet werden.',
  'status.error.getStatusFailed': 'Systemstatus konnte nicht abgerufen werden.',
  'status.error.getUptimeFailed': 'Verfügbarkeitsdaten konnten nicht abgerufen werden.',
}
