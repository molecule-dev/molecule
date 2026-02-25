import type { StatusTranslations } from './types.js'

/** Status translations for Swahili. */
export const sw: StatusTranslations = {
  'status.error.serviceNotFound': 'Huduma haikupatikana.',
  'status.error.incidentNotFound': 'Tukio halikupatikana.',
  'status.error.validationFailed': 'Uthibitishaji umeshindwa: {{errors}}',
  'status.error.createServiceFailed': 'Imeshindwa kuunda huduma.',
  'status.error.updateServiceFailed': 'Imeshindwa kusasisha huduma.',
  'status.error.deleteServiceFailed': 'Imeshindwa kufuta huduma.',
  'status.error.getServiceFailed': 'Imeshindwa kupata huduma.',
  'status.error.listServicesFailed': 'Imeshindwa kuorodhesha huduma.',
  'status.error.createIncidentFailed': 'Imeshindwa kuunda tukio.',
  'status.error.updateIncidentFailed': 'Imeshindwa kusasisha tukio.',
  'status.error.listIncidentsFailed': 'Imeshindwa kuorodhesha matukio.',
  'status.error.getStatusFailed': 'Imeshindwa kupata hali ya mfumo.',
  'status.error.getUptimeFailed': 'Imeshindwa kupata data ya muda wa uendeshaji.',
}
