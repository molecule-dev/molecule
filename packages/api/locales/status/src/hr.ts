import type { StatusTranslations } from './types.js'

/** Status translations for Croatian. */
export const hr: StatusTranslations = {
  'status.error.serviceNotFound': 'Usluga nije pronađena.',
  'status.error.incidentNotFound': 'Incident nije pronađen.',
  'status.error.validationFailed': 'Validacija neuspješna: {{errors}}',
  'status.error.createServiceFailed': 'Stvaranje usluge neuspješno.',
  'status.error.updateServiceFailed': 'Ažuriranje usluge neuspješno.',
  'status.error.deleteServiceFailed': 'Brisanje usluge neuspješno.',
  'status.error.getServiceFailed': 'Dohvaćanje usluge neuspješno.',
  'status.error.listServicesFailed': 'Popis usluga neuspješan.',
  'status.error.createIncidentFailed': 'Stvaranje incidenta neuspješno.',
  'status.error.updateIncidentFailed': 'Ažuriranje incidenta neuspješno.',
  'status.error.listIncidentsFailed': 'Popis incidenata neuspješan.',
  'status.error.getStatusFailed': 'Dohvaćanje statusa sustava neuspješno.',
  'status.error.getUptimeFailed': 'Dohvaćanje podataka o dostupnosti neuspješno.',
}
