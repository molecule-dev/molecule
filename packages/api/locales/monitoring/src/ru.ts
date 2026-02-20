import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Russian. */
export const ru: MonitoringTranslations = {
  'monitoring.error.noProvider':
    'Провайдер мониторинга не настроен. Сначала вызовите setProvider().',
  'monitoring.check.database.notBonded': 'Подключение к базе данных не настроено.',
  'monitoring.check.database.poolUnavailable': 'Пул базы данных недоступен.',
  'monitoring.check.cache.notBonded': 'Подключение к кешу не настроено.',
  'monitoring.check.cache.providerUnavailable': 'Провайдер кеша недоступен.',
  'monitoring.check.http.badStatus': 'HTTP {{status}} ответ.',
  'monitoring.check.http.timeout': 'Время запроса истекло.',
  'monitoring.check.http.degraded':
    'Время ответа {{latencyMs}}мс превысило порог {{thresholdMs}}мс.',
  'monitoring.check.bond.notBonded': "Связь '{{bondType}}' не зарегистрирована.",
  'monitoring.check.timedOut': 'Проверка завершилась по тайм-ауту через {{timeoutMs}}мс.',
}
