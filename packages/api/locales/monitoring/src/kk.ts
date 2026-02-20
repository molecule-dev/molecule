import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Kazakh. */
export const kk: MonitoringTranslations = {
  'monitoring.error.noProvider':
    'Мониторинг провайдері конфигурацияланбаған. Алдымен setProvider() шақырыңыз.',
  'monitoring.check.database.notBonded': 'Деректер қоры байланысы конфигурацияланбаған.',
  'monitoring.check.database.poolUnavailable': 'Деректер қоры пулы қолжетімсіз.',
  'monitoring.check.cache.notBonded': 'Кэш байланысы конфигурацияланбаған.',
  'monitoring.check.cache.providerUnavailable': 'Кэш провайдері қолжетімсіз.',
  'monitoring.check.http.badStatus': 'HTTP {{status}} жауабы.',
  'monitoring.check.http.timeout': 'Сұрау уақыты аяқталды.',
  'monitoring.check.http.degraded':
    'Жауап уақыты {{latencyMs}}мс шекті {{thresholdMs}}мс асып кетті.',
  'monitoring.check.bond.notBonded': "'{{bondType}}' байланысы тіркелмеген.",
  'monitoring.check.timedOut': 'Тексеру {{timeoutMs}}мс кейін уақыты бітті.',
}
