import type { StatusTranslations } from './types.js'

/** Status translations for Danish. */
export const da: StatusTranslations = {
  'status.error.serviceNotFound': 'Tjeneste ikke fundet.',
  'status.error.incidentNotFound': 'Hændelse ikke fundet.',
  'status.error.validationFailed': 'Validering fejlede: {{errors}}',
  'status.error.createServiceFailed': 'Kunne ikke oprette tjeneste.',
  'status.error.updateServiceFailed': 'Kunne ikke opdatere tjeneste.',
  'status.error.deleteServiceFailed': 'Kunne ikke slette tjeneste.',
  'status.error.getServiceFailed': 'Kunne ikke hente tjeneste.',
  'status.error.listServicesFailed': 'Kunne ikke liste tjenester.',
  'status.error.createIncidentFailed': 'Kunne ikke oprette hændelse.',
  'status.error.updateIncidentFailed': 'Kunne ikke opdatere hændelse.',
  'status.error.listIncidentsFailed': 'Kunne ikke liste hændelser.',
  'status.error.getStatusFailed': 'Kunne ikke hente systemstatus.',
  'status.error.getUptimeFailed': 'Kunne ikke hente oppetidsdata.',
}
