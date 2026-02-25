import type { StatusTranslations } from './types.js'

/** Status translations for Bosnian. */
export const bs: StatusTranslations = {
  'status.error.serviceNotFound': 'Usluga nije pronađena.',
  'status.error.incidentNotFound': 'Incident nije pronađen.',
  'status.error.validationFailed': 'Validacija nije uspjela: {{errors}}',
  'status.error.createServiceFailed': 'Kreiranje usluge nije uspjelo.',
  'status.error.updateServiceFailed': 'Ažuriranje usluge nije uspjelo.',
  'status.error.deleteServiceFailed': 'Brisanje usluge nije uspjelo.',
  'status.error.getServiceFailed': 'Dohvaćanje usluge nije uspjelo.',
  'status.error.listServicesFailed': 'Listanje usluga nije uspjelo.',
  'status.error.createIncidentFailed': 'Kreiranje incidenta nije uspjelo.',
  'status.error.updateIncidentFailed': 'Ažuriranje incidenta nije uspjelo.',
  'status.error.listIncidentsFailed': 'Listanje incidenata nije uspjelo.',
  'status.error.getStatusFailed': 'Dohvaćanje statusa sistema nije uspjelo.',
  'status.error.getUptimeFailed': 'Dohvaćanje podataka o dostupnosti nije uspjelo.',
}
