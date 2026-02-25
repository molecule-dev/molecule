import type { StatusTranslations } from './types.js'

/** Status translations for Bulgarian. */
export const bg: StatusTranslations = {
  'status.error.serviceNotFound': 'Услугата не е намерена.',
  'status.error.incidentNotFound': 'Инцидентът не е намерен.',
  'status.error.validationFailed': 'Валидацията е неуспешна: {{errors}}',
  'status.error.createServiceFailed': 'Неуспешно създаване на услуга.',
  'status.error.updateServiceFailed': 'Неуспешно актуализиране на услуга.',
  'status.error.deleteServiceFailed': 'Неуспешно изтриване на услуга.',
  'status.error.getServiceFailed': 'Неуспешно извличане на услуга.',
  'status.error.listServicesFailed': 'Неуспешно извличане на списък с услуги.',
  'status.error.createIncidentFailed': 'Неуспешно създаване на инцидент.',
  'status.error.updateIncidentFailed': 'Неуспешно актуализиране на инцидент.',
  'status.error.listIncidentsFailed': 'Неуспешно извличане на списък с инциденти.',
  'status.error.getStatusFailed': 'Неуспешно извличане на състоянието на системата.',
  'status.error.getUptimeFailed': 'Неуспешно извличане на данни за времето на работа.',
}
