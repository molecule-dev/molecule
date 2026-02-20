import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Armenian. */
export const hy: MonitoringTranslations = {
  'monitoring.error.noProvider': 'Monitoring provider not configured. Call setProvider() first.',
  'monitoring.check.database.notBonded': 'Database bond not configured.',
  'monitoring.check.database.poolUnavailable': 'Տվյալների բազայի փուլը անհասանելի է.',
  'monitoring.check.cache.notBonded': 'Cache bond not configured.',
  'monitoring.check.cache.providerUnavailable': 'Քեշի մատակարարը անհասանելի է.',
  'monitoring.check.http.badStatus': 'HTTP {{status}} response.',
  'monitoring.check.http.timeout': 'Request timed out.',
  'monitoring.check.http.degraded':
    'Պատասխանի ժամանակը {{latencyMs}}ms գերազանցել է շեմը {{thresholdMs}}ms.',
  'monitoring.check.bond.notBonded': "Bond '{{bondType}}' is not registered.",
  'monitoring.check.timedOut': 'Ստուգումը ժամկետանց է {{timeoutMs}}ms հետո.',
}
