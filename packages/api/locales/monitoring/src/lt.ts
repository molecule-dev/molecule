import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Lithuanian. */
export const lt: MonitoringTranslations = {
  'monitoring.error.noProvider':
    'Stebėjimo teikėjas nesukonfigūruotas. Pirmiausia iškvieskite setProvider().',
  'monitoring.check.database.notBonded': 'Duomenų bazės ryšys nesukonfigūruotas.',
  'monitoring.check.database.poolUnavailable': 'Duomenų bazės telkinys nepasiekiamas.',
  'monitoring.check.cache.notBonded': 'Podėlio ryšys nesukonfigūruotas.',
  'monitoring.check.cache.providerUnavailable': 'Podėlio tiekėjas nepasiekiamas.',
  'monitoring.check.http.badStatus': 'HTTP {{status}} atsakymas.',
  'monitoring.check.http.timeout': 'Užklausos laikas baigėsi.',
  'monitoring.check.http.degraded':
    'Atsako laikas {{latencyMs}}ms viršijo slenkstį {{thresholdMs}}ms.',
  'monitoring.check.bond.notBonded': "Ryšys '{{bondType}}' neregistruotas.",
  'monitoring.check.timedOut': 'Patikrinimas baigėsi po {{timeoutMs}}ms.',
}
