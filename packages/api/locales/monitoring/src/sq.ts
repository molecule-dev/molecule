import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Albanian. */
export const sq: MonitoringTranslations = {
  'monitoring.error.noProvider':
    'Ofruesi i monitorimit nuk është konfiguruar. Thirrisni setProvider() fillimisht.',
  'monitoring.check.database.notBonded': 'Lidhja e bazës së të dhënave nuk është konfiguruar.',
  'monitoring.check.database.poolUnavailable':
    'Grupi i bazës së të dhënave nuk është i disponueshëm.',
  'monitoring.check.cache.notBonded': 'Lidhja e cache nuk është konfiguruar.',
  'monitoring.check.cache.providerUnavailable': 'Ofruesi i cache nuk është i disponueshëm.',
  'monitoring.check.http.badStatus': 'Përgjigje HTTP {{status}}.',
  'monitoring.check.http.timeout': 'Kërkesa ka skaduar.',
  'monitoring.check.http.degraded':
    'Koha e përgjigjes {{latencyMs}}ms tejkaloi pragun {{thresholdMs}}ms.',
  'monitoring.check.bond.notBonded': "Lidhja '{{bondType}}' nuk është e regjistruar.",
  'monitoring.check.timedOut': 'Kontrolli skadoi pas {{timeoutMs}}ms.',
}
