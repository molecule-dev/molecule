import type { StatusTranslations } from './types.js'

/** Status translations for Romanian. */
export const ro: StatusTranslations = {
  'status.error.serviceNotFound': 'Serviciul nu a fost găsit.',
  'status.error.incidentNotFound': 'Incidentul nu a fost găsit.',
  'status.error.validationFailed': 'Validarea a eșuat: {{errors}}',
  'status.error.createServiceFailed': 'Crearea serviciului a eșuat.',
  'status.error.updateServiceFailed': 'Actualizarea serviciului a eșuat.',
  'status.error.deleteServiceFailed': 'Ștergerea serviciului a eșuat.',
  'status.error.getServiceFailed': 'Obținerea serviciului a eșuat.',
  'status.error.listServicesFailed': 'Listarea serviciilor a eșuat.',
  'status.error.createIncidentFailed': 'Crearea incidentului a eșuat.',
  'status.error.updateIncidentFailed': 'Actualizarea incidentului a eșuat.',
  'status.error.listIncidentsFailed': 'Listarea incidentelor a eșuat.',
  'status.error.getStatusFailed': 'Obținerea stării sistemului a eșuat.',
  'status.error.getUptimeFailed': 'Obținerea datelor de disponibilitate a eșuat.',
}
