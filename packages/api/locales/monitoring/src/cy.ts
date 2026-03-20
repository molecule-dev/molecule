import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Welsh. */
export const cy: MonitoringTranslations = {
  'monitoring.error.noProvider':
    'Darparwr monitro heb ei ffurfweddu. Galwch setProvider() yn gyntaf.',
  'monitoring.check.database.notBonded': 'Bond cronfa ddata heb ei ffurfweddu.',
  'monitoring.check.database.poolUnavailable': 'Cronfa ddata ddim ar gael.',
  'monitoring.check.cache.notBonded': 'Bond storfa heb ei ffurfweddu.',
  'monitoring.check.cache.providerUnavailable': 'Darparwr storfa ddim ar gael.',
  'monitoring.check.http.badStatus': 'Ymateb HTTP {{status}}.',
  'monitoring.check.http.timeout': 'Cais wedi amseru allan.',
  'monitoring.check.http.degraded':
    'Amser ymateb {{latencyMs}}ms wedi rhagori ar y trothwy {{thresholdMs}}ms.',
  'monitoring.check.bond.notBonded': "Nid yw bond '{{bondType}}' wedi'i gofrestru.",
  'monitoring.check.timedOut': 'Gwiriad wedi amseru allan ar ôl {{timeoutMs}}ms.',
}
