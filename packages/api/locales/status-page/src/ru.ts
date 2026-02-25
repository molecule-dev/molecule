import type { StatusTranslations } from './types.js'

/** Status translations for Russian. */
export const ru: StatusTranslations = {
  'status.error.serviceNotFound': 'Сервис не найден.',
  'status.error.incidentNotFound': 'Инцидент не найден.',
  'status.error.validationFailed': 'Ошибка валидации: {{errors}}',
  'status.error.createServiceFailed': 'Не удалось создать сервис.',
  'status.error.updateServiceFailed': 'Не удалось обновить сервис.',
  'status.error.deleteServiceFailed': 'Не удалось удалить сервис.',
  'status.error.getServiceFailed': 'Не удалось получить сервис.',
  'status.error.listServicesFailed': 'Не удалось получить список сервисов.',
  'status.error.createIncidentFailed': 'Не удалось создать инцидент.',
  'status.error.updateIncidentFailed': 'Не удалось обновить инцидент.',
  'status.error.listIncidentsFailed': 'Не удалось получить список инцидентов.',
  'status.error.getStatusFailed': 'Не удалось получить статус системы.',
  'status.error.getUptimeFailed': 'Не удалось получить данные о времени работы.',
}
