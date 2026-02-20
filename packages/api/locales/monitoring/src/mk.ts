import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Macedonian. */
export const mk: MonitoringTranslations = {
  'monitoring.error.noProvider':
    'Провајдерот за мониторинг не е конфигуриран. Прво повикајте setProvider().',
  'monitoring.check.database.notBonded': 'Врската со базата на податоци не е конфигурирана.',
  'monitoring.check.database.poolUnavailable': 'Базата на податоци не е достапна.',
  'monitoring.check.cache.notBonded': 'Врската со кешот не е конфигурирана.',
  'monitoring.check.cache.providerUnavailable': 'Провајдерот на кеш не е достапен.',
  'monitoring.check.http.badStatus': 'HTTP {{status}} одговор.',
  'monitoring.check.http.timeout': 'Барањето истече.',
  'monitoring.check.http.degraded':
    'Времето на одговор {{latencyMs}}ms го надмина прагот {{thresholdMs}}ms.',
  'monitoring.check.bond.notBonded': "Врската '{{bondType}}' не е регистрирана.",
  'monitoring.check.timedOut': 'Проверката истече по {{timeoutMs}}ms.',
}
