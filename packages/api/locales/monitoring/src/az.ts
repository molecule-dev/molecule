import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Azerbaijani. */
export const az: MonitoringTranslations = {
  'monitoring.error.noProvider':
    'Monitorinq provayderi konfiqurasiya edilməyib. Əvvəlcə setProvider() çağırın.',
  'monitoring.check.database.notBonded': 'Verilənlər bazası bağlantısı konfiqurasiya edilməyib.',
  'monitoring.check.database.poolUnavailable': 'Verilənlər bazası hovuzu əlçatan deyil.',
  'monitoring.check.cache.notBonded': 'Keş bağlantısı konfiqurasiya edilməyib.',
  'monitoring.check.cache.providerUnavailable': 'Keş provayderi əlçatan deyil.',
  'monitoring.check.http.badStatus': 'HTTP {{status}} cavabı.',
  'monitoring.check.http.timeout': 'Sorğu vaxtı bitdi.',
  'monitoring.check.http.degraded': 'Cavab müddəti {{latencyMs}}ms həddi {{thresholdMs}}ms aşdı.',
  'monitoring.check.bond.notBonded': "'{{bondType}}' bağlantısı qeydiyyatdan keçməyib.",
  'monitoring.check.timedOut': 'Yoxlama {{timeoutMs}}ms sonra vaxtı keçdi.',
}
