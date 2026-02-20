import type { StatusTranslations } from './types.js'

/** Status translations for Norwegian Bokmål. */
export const nb: StatusTranslations = {
  'status.error.serviceNotFound': 'Tjeneste ikke funnet.',
  'status.error.incidentNotFound': 'Hendelse ikke funnet.',
  'status.error.validationFailed': 'Validering mislyktes: {{errors}}',
  'status.error.createServiceFailed': 'Kunne ikke opprette tjeneste.',
  'status.error.updateServiceFailed': 'Kunne ikke oppdatere tjeneste.',
  'status.error.deleteServiceFailed': 'Kunne ikke slette tjeneste.',
  'status.error.getServiceFailed': 'Kunne ikke hente tjeneste.',
  'status.error.listServicesFailed': 'Kunne ikke liste tjenester.',
  'status.error.createIncidentFailed': 'Kunne ikke opprette hendelse.',
  'status.error.updateIncidentFailed': 'Kunne ikke oppdatere hendelse.',
  'status.error.listIncidentsFailed': 'Kunne ikke liste hendelser.',
  'status.error.getStatusFailed': 'Kunne ikke hente systemstatus.',
  'status.error.getUptimeFailed': 'Kunne ikke hente oppetidsdata.',
}
