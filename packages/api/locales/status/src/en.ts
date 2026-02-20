import type { StatusTranslations } from './types.js'

/** Status translations for English. */
export const en: StatusTranslations = {
  'status.error.serviceNotFound': 'Service not found.',
  'status.error.incidentNotFound': 'Incident not found.',
  'status.error.validationFailed': 'Validation failed: {{errors}}',
  'status.error.createServiceFailed': 'Failed to create service.',
  'status.error.updateServiceFailed': 'Failed to update service.',
  'status.error.deleteServiceFailed': 'Failed to delete service.',
  'status.error.getServiceFailed': 'Failed to fetch service.',
  'status.error.listServicesFailed': 'Failed to list services.',
  'status.error.createIncidentFailed': 'Failed to create incident.',
  'status.error.updateIncidentFailed': 'Failed to update incident.',
  'status.error.listIncidentsFailed': 'Failed to list incidents.',
  'status.error.getStatusFailed': 'Failed to fetch system status.',
  'status.error.getUptimeFailed': 'Failed to fetch uptime data.',
}
