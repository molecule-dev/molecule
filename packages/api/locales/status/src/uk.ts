import type { StatusTranslations } from './types.js'

/** Status translations for Ukrainian. */
export const uk: StatusTranslations = {
  'status.error.serviceNotFound': 'Сервіс не знайдено.',
  'status.error.incidentNotFound': 'Інцидент не знайдено.',
  'status.error.validationFailed': 'Валідація не пройшла: {{errors}}',
  'status.error.createServiceFailed': 'Не вдалося створити сервіс.',
  'status.error.updateServiceFailed': 'Не вдалося оновити сервіс.',
  'status.error.deleteServiceFailed': 'Не вдалося видалити сервіс.',
  'status.error.getServiceFailed': 'Не вдалося отримати сервіс.',
  'status.error.listServicesFailed': 'Не вдалося отримати список сервісів.',
  'status.error.createIncidentFailed': 'Не вдалося створити інцидент.',
  'status.error.updateIncidentFailed': 'Не вдалося оновити інцидент.',
  'status.error.listIncidentsFailed': 'Не вдалося отримати список інцидентів.',
  'status.error.getStatusFailed': 'Не вдалося отримати статус системи.',
  'status.error.getUptimeFailed': 'Не вдалося отримати дані про аптайм.',
}
