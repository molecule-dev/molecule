import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Malayalam. */
export const ml: MonitoringTranslations = {
  'monitoring.error.noProvider': 'Monitoring provider not configured. Call setProvider() first.',
  'monitoring.check.database.notBonded': 'Database bond not configured.',
  'monitoring.check.database.poolUnavailable': 'ഡാറ്റാബേസ് പൂൾ ലഭ്യമല്ല.',
  'monitoring.check.cache.notBonded': 'Cache bond not configured.',
  'monitoring.check.cache.providerUnavailable': 'കാഷ് പ്രൊവൈഡർ ലഭ്യമല്ല.',
  'monitoring.check.http.badStatus': 'HTTP {{status}} response.',
  'monitoring.check.http.timeout': 'Request timed out.',
  'monitoring.check.http.degraded': 'പ്രതികരണ സമയം {{latencyMs}}ms പരിധി {{thresholdMs}}ms കടന്നു.',
  'monitoring.check.bond.notBonded': "Bond '{{bondType}}' is not registered.",
  'monitoring.check.timedOut': '{{timeoutMs}}ms കഴിഞ്ഞ് പരിശോധന കാലഹരണപ്പെട്ടു.',
}
