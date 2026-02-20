import type { StatusTranslations } from './types.js'

/** Status translations for Lithuanian. */
export const lt: StatusTranslations = {
  'status.error.serviceNotFound': 'Paslauga nerasta.',
  'status.error.incidentNotFound': 'Incidentas nerastas.',
  'status.error.validationFailed': 'Patvirtinimas nepavyko: {{errors}}',
  'status.error.createServiceFailed': 'Nepavyko sukurti paslaugos.',
  'status.error.updateServiceFailed': 'Nepavyko atnaujinti paslaugos.',
  'status.error.deleteServiceFailed': 'Nepavyko ištrinti paslaugos.',
  'status.error.getServiceFailed': 'Nepavyko gauti paslaugos.',
  'status.error.listServicesFailed': 'Nepavyko išvardyti paslaugų.',
  'status.error.createIncidentFailed': 'Nepavyko sukurti incidento.',
  'status.error.updateIncidentFailed': 'Nepavyko atnaujinti incidento.',
  'status.error.listIncidentsFailed': 'Nepavyko išvardyti incidentų.',
  'status.error.getStatusFailed': 'Nepavyko gauti sistemos būsenos.',
  'status.error.getUptimeFailed': 'Nepavyko gauti veikimo laiko duomenų.',
}
