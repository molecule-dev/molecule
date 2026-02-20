/** Translation keys for the status locale package. */
export type StatusTranslationKey =
  | 'status.error.serviceNotFound'
  | 'status.error.incidentNotFound'
  | 'status.error.validationFailed'
  | 'status.error.createServiceFailed'
  | 'status.error.updateServiceFailed'
  | 'status.error.deleteServiceFailed'
  | 'status.error.getServiceFailed'
  | 'status.error.listServicesFailed'
  | 'status.error.createIncidentFailed'
  | 'status.error.updateIncidentFailed'
  | 'status.error.listIncidentsFailed'
  | 'status.error.getStatusFailed'
  | 'status.error.getUptimeFailed'

/** Translation record mapping status keys to translated strings. */
export type StatusTranslations = Record<StatusTranslationKey, string>
