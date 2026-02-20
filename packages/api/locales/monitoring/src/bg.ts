import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Bulgarian. */
export const bg: MonitoringTranslations = {
  'monitoring.error.noProvider':
    'Доставчикът за мониторинг не е конфигуриран. Извикайте първо setProvider().',
  'monitoring.check.database.notBonded': 'Връзката с базата данни не е конфигурирана.',
  'monitoring.check.database.poolUnavailable': 'Пулът на базата данни е недостъпен.',
  'monitoring.check.cache.notBonded': 'Връзката с кеша не е конфигурирана.',
  'monitoring.check.cache.providerUnavailable': 'Доставчикът на кеш е недостъпен.',
  'monitoring.check.http.badStatus': 'HTTP {{status}} отговор.',
  'monitoring.check.http.timeout': 'Времето за заявката изтече.',
  'monitoring.check.http.degraded':
    'Времето за отговор {{latencyMs}}ms надхвърли прага {{thresholdMs}}ms.',
  'monitoring.check.bond.notBonded': "Връзката '{{bondType}}' не е регистрирана.",
  'monitoring.check.timedOut': 'Проверката изтече след {{timeoutMs}}ms.',
}
