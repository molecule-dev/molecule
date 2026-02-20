import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Kyrgyz. */
export const ky: MonitoringTranslations = {
  'monitoring.error.noProvider': 'Monitoring provider not configured. Call setProvider() first.',
  'monitoring.check.database.notBonded': 'Database bond not configured.',
  'monitoring.check.database.poolUnavailable': 'Маалымат базасынын пулу жеткиликсиз.',
  'monitoring.check.cache.notBonded': 'Cache bond not configured.',
  'monitoring.check.cache.providerUnavailable': 'Кэш провайдери жеткиликсиз.',
  'monitoring.check.http.badStatus': 'HTTP {{status}} response.',
  'monitoring.check.http.timeout': 'Request timed out.',
  'monitoring.check.http.degraded':
    'Жооп убактысы {{latencyMs}}мс чекти {{thresholdMs}}мс ашып кетти.',
  'monitoring.check.bond.notBonded': "Bond '{{bondType}}' is not registered.",
  'monitoring.check.timedOut': 'Текшерүү {{timeoutMs}}мс кийин убактысы бүттү.',
}
