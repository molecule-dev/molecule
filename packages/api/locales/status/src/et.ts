import type { StatusTranslations } from './types.js'

/** Status translations for Estonian. */
export const et: StatusTranslations = {
  'status.error.serviceNotFound': 'Teenust ei leitud.',
  'status.error.incidentNotFound': 'Intsidenti ei leitud.',
  'status.error.validationFailed': 'Valideerimine ebaõnnestus: {{errors}}',
  'status.error.createServiceFailed': 'Teenuse loomine ebaõnnestus.',
  'status.error.updateServiceFailed': 'Teenuse värskendamine ebaõnnestus.',
  'status.error.deleteServiceFailed': 'Teenuse kustutamine ebaõnnestus.',
  'status.error.getServiceFailed': 'Teenuse toomine ebaõnnestus.',
  'status.error.listServicesFailed': 'Teenuste loetlemine ebaõnnestus.',
  'status.error.createIncidentFailed': 'Intsidendi loomine ebaõnnestus.',
  'status.error.updateIncidentFailed': 'Intsidendi värskendamine ebaõnnestus.',
  'status.error.listIncidentsFailed': 'Intsidentide loetlemine ebaõnnestus.',
  'status.error.getStatusFailed': 'Süsteemi oleku toomine ebaõnnestus.',
  'status.error.getUptimeFailed': 'Tööaja andmete toomine ebaõnnestus.',
}
