import type { StatusTranslations } from './types.js'

/** Status translations for Basque. */
export const eu: StatusTranslations = {
  'status.error.serviceNotFound': 'Zerbitzua ez da aurkitu.',
  'status.error.incidentNotFound': 'Gertakaria ez da aurkitu.',
  'status.error.validationFailed': 'Baliozkotzeak huts egin du: {{errors}}',
  'status.error.createServiceFailed': 'Zerbitzua sortzeak huts egin du.',
  'status.error.updateServiceFailed': 'Zerbitzua eguneratzeak huts egin du.',
  'status.error.deleteServiceFailed': 'Zerbitzua ezabatzeak huts egin du.',
  'status.error.getServiceFailed': 'Zerbitzua eskuratzeak huts egin du.',
  'status.error.listServicesFailed': 'Zerbitzuak zerrendatzeak huts egin du.',
  'status.error.createIncidentFailed': 'Gertakaria sortzeak huts egin du.',
  'status.error.updateIncidentFailed': 'Gertakaria eguneratzeak huts egin du.',
  'status.error.listIncidentsFailed': 'Gertakariak zerrendatzeak huts egin du.',
  'status.error.getStatusFailed': 'Sistemaren egoera eskuratzeak huts egin du.',
  'status.error.getUptimeFailed': 'Funtzionamendu-datuak eskuratzeak huts egin du.',
}
