import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Serbian. */
export const sr: MonitoringTranslations = {
  'monitoring.error.noProvider':
    'Провајдер за надгледање није конфигурисан. Прво позовите setProvider().',
  'monitoring.check.database.notBonded': 'Веза са базом података није конфигурисана.',
  'monitoring.check.database.poolUnavailable': 'Пул базе података није доступан.',
  'monitoring.check.cache.notBonded': 'Веза са кешом није конфигурисана.',
  'monitoring.check.cache.providerUnavailable': 'Провајдер кеша није доступан.',
  'monitoring.check.http.badStatus': 'HTTP {{status}} одговор.',
  'monitoring.check.http.timeout': 'Захтев је истекао.',
  'monitoring.check.http.degraded':
    'Време одговора {{latencyMs}}ms прекорачило праг {{thresholdMs}}ms.',
  'monitoring.check.bond.notBonded': "Веза '{{bondType}}' није регистрована.",
  'monitoring.check.timedOut': 'Провера је истекла након {{timeoutMs}}ms.',
}
