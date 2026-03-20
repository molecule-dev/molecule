import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Armenian. */
export const hy: MonitoringTranslations = {
  'monitoring.error.noProvider': 'Մոնիթորինգի պրովայդերը կարգավորված չէ. Նախ setProvider() կանչեք.',
  'monitoring.check.database.notBonded': 'Տվյալների բազայի bond-ը կարգավորված չէ.',
  'monitoring.check.database.poolUnavailable': 'Տվյալների բազայի փուլը անհասանելի է.',
  'monitoring.check.cache.notBonded': 'Քեշի bond-ը կարգավորված չէ.',
  'monitoring.check.cache.providerUnavailable': 'Քեշի մատակարարը անհասանելի է.',
  'monitoring.check.http.badStatus': 'HTTP {{status}} պատասխան.',
  'monitoring.check.http.timeout': 'Հարցումը ժամկետանց է.',
  'monitoring.check.http.degraded':
    'Պատասխանի ժամանակը {{latencyMs}}ms գերազանցել է շեմը {{thresholdMs}}ms.',
  'monitoring.check.bond.notBonded': "Bond '{{bondType}}'-ը գրանցված չէ.",
  'monitoring.check.timedOut': 'Ստուգումը ժամկետանց է {{timeoutMs}}ms հետո.',
}
