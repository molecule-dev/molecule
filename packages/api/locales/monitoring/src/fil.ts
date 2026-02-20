import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Filipino. */
export const fil: MonitoringTranslations = {
  'monitoring.error.noProvider':
    'Hindi naka-configure ang monitoring provider. Tumawag muna ng setProvider().',
  'monitoring.check.database.notBonded': 'Hindi naka-configure ang database bond.',
  'monitoring.check.database.poolUnavailable': 'Hindi available ang database pool.',
  'monitoring.check.cache.notBonded': 'Hindi naka-configure ang cache bond.',
  'monitoring.check.cache.providerUnavailable': 'Hindi available ang cache provider.',
  'monitoring.check.http.badStatus': 'HTTP {{status}} na tugon.',
  'monitoring.check.http.timeout': 'Nag-timeout ang kahilingan.',
  'monitoring.check.http.degraded':
    'Ang response time na {{latencyMs}}ms ay lumampas sa threshold na {{thresholdMs}}ms.',
  'monitoring.check.bond.notBonded': "Ang bond na '{{bondType}}' ay hindi nakarehistro.",
  'monitoring.check.timedOut': 'Nag-timeout ang check pagkatapos ng {{timeoutMs}}ms.',
}
