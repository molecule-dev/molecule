import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Ukrainian. */
export const uk: MonitoringTranslations = {
  'monitoring.error.noProvider':
    'Провайдер моніторингу не налаштований. Спочатку викличте setProvider().',
  'monitoring.check.database.notBonded': "З'єднання з базою даних не налаштоване.",
  'monitoring.check.database.poolUnavailable': 'Пул бази даних недоступний.',
  'monitoring.check.cache.notBonded': "З'єднання з кешем не налаштоване.",
  'monitoring.check.cache.providerUnavailable': 'Провайдер кешу недоступний.',
  'monitoring.check.http.badStatus': 'HTTP {{status}} відповідь.',
  'monitoring.check.http.timeout': 'Час запиту вичерпано.',
  'monitoring.check.http.degraded':
    'Час відповіді {{latencyMs}}мс перевищив поріг {{thresholdMs}}мс.',
  'monitoring.check.bond.notBonded': "З'єднання '{{bondType}}' не зареєстроване.",
  'monitoring.check.timedOut': 'Перевірка завершилася по тайм-ауту через {{timeoutMs}}мс.',
}
