import type { StatusTranslations } from './types.js'

/** Status translations for Welsh. */
export const cy: StatusTranslations = {
  'status.error.serviceNotFound': 'Gwasanaeth heb ei ganfod.',
  'status.error.incidentNotFound': 'Digwyddiad heb ei ganfod.',
  'status.error.validationFailed': 'Dilysu wedi methu: {{errors}}',
  'status.error.createServiceFailed': 'Methwyd â chreu gwasanaeth.',
  'status.error.updateServiceFailed': "Methwyd â diweddaru'r gwasanaeth.",
  'status.error.deleteServiceFailed': "Methwyd â dileu'r gwasanaeth.",
  'status.error.getServiceFailed': 'Methwyd â nôl y gwasanaeth.',
  'status.error.listServicesFailed': 'Methwyd â rhestru gwasanaethau.',
  'status.error.createIncidentFailed': 'Methwyd â chreu digwyddiad.',
  'status.error.updateIncidentFailed': "Methwyd â diweddaru'r digwyddiad.",
  'status.error.listIncidentsFailed': 'Methwyd â rhestru digwyddiadau.',
  'status.error.getStatusFailed': 'Methwyd â nôl statws y system.',
  'status.error.getUptimeFailed': 'Methwyd â nôl data amser rhedeg.',
}
