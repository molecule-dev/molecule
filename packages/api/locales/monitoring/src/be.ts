import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Belarusian. */
export const be: MonitoringTranslations = {
  'monitoring.error.noProvider':
    'Правайдар маніторынгу не наладжаны. Спачатку выклічце setProvider().',
  'monitoring.check.database.notBonded': 'Злучэнне з базай даных не наладжана.',
  'monitoring.check.database.poolUnavailable': 'Пул базы дадзеных недаступны.',
  'monitoring.check.cache.notBonded': 'Злучэнне з кэшам не наладжана.',
  'monitoring.check.cache.providerUnavailable': 'Правайдар кэша недаступны.',
  'monitoring.check.http.badStatus': 'HTTP {{status}} адказ.',
  'monitoring.check.http.timeout': 'Час запыту скончыўся.',
  'monitoring.check.http.degraded': 'Час адказу {{latencyMs}}мс перавысіў парог {{thresholdMs}}мс.',
  'monitoring.check.bond.notBonded': "Злучэнне '{{bondType}}' не зарэгістравана.",
  'monitoring.check.timedOut': 'Праверка завяршылася па тайм-аўце праз {{timeoutMs}}мс.',
}
