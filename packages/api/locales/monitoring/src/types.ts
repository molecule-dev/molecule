/** Translation keys for the monitoring locale package. */
export type MonitoringTranslationKey =
  | 'monitoring.error.noProvider'
  | 'monitoring.check.database.notBonded'
  | 'monitoring.check.database.poolUnavailable'
  | 'monitoring.check.cache.notBonded'
  | 'monitoring.check.cache.providerUnavailable'
  | 'monitoring.check.http.badStatus'
  | 'monitoring.check.http.timeout'
  | 'monitoring.check.http.degraded'
  | 'monitoring.check.bond.notBonded'
  | 'monitoring.check.timedOut'

/** Translation record mapping monitoring keys to translated strings. */
export type MonitoringTranslations = Record<MonitoringTranslationKey, string>
