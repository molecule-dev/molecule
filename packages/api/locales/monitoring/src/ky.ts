import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Kyrgyz. */
export const ky: MonitoringTranslations = {
  'monitoring.error.noProvider':
    'Мониторинг провайдери конфигурацияланган эмес. Алгач setProvider() чакырыңыз.',
  'monitoring.check.database.notBonded': 'Маалымат базасынын бонду конфигурацияланган эмес.',
  'monitoring.check.database.poolUnavailable': 'Маалымат базасынын пулу жеткиликсиз.',
  'monitoring.check.cache.notBonded': 'Кэш бонду конфигурацияланган эмес.',
  'monitoring.check.cache.providerUnavailable': 'Кэш провайдери жеткиликсиз.',
  'monitoring.check.http.badStatus': 'HTTP {{status}} жообу.',
  'monitoring.check.http.timeout': 'Суранычтын убактысы бүттү.',
  'monitoring.check.http.degraded':
    'Жооп убактысы {{latencyMs}}мс чекти {{thresholdMs}}мс ашып кетти.',
  'monitoring.check.bond.notBonded': "Bond '{{bondType}}' катталган эмес.",
  'monitoring.check.timedOut': 'Текшерүү {{timeoutMs}}мс кийин убактысы бүттү.',
}
