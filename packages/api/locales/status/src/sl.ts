import type { StatusTranslations } from './types.js'

/** Status translations for Slovenian. */
export const sl: StatusTranslations = {
  'status.error.serviceNotFound': 'Storitev ni najdena.',
  'status.error.incidentNotFound': 'Incident ni najden.',
  'status.error.validationFailed': 'Preverjanje ni uspelo: {{errors}}',
  'status.error.createServiceFailed': 'Ustvarjanje storitve ni uspelo.',
  'status.error.updateServiceFailed': 'Posodobitev storitve ni uspela.',
  'status.error.deleteServiceFailed': 'Brisanje storitve ni uspelo.',
  'status.error.getServiceFailed': 'Pridobivanje storitve ni uspelo.',
  'status.error.listServicesFailed': 'Izpis storitev ni uspel.',
  'status.error.createIncidentFailed': 'Ustvarjanje incidenta ni uspelo.',
  'status.error.updateIncidentFailed': 'Posodobitev incidenta ni uspela.',
  'status.error.listIncidentsFailed': 'Izpis incidentov ni uspel.',
  'status.error.getStatusFailed': 'Pridobivanje stanja sistema ni uspelo.',
  'status.error.getUptimeFailed': 'Pridobivanje podatkov o razpoložljivosti ni uspelo.',
}
