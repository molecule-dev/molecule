import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Swedish. */
export const sv: MonitoringTranslations = {
  'monitoring.error.noProvider':
    'Övervakningsleverantör inte konfigurerad. Anropa setProvider() först.',
  'monitoring.check.database.notBonded': 'Databasanslutning inte konfigurerad.',
  'monitoring.check.database.poolUnavailable': 'Databaspool otillgänglig.',
  'monitoring.check.cache.notBonded': 'Cacheanslutning inte konfigurerad.',
  'monitoring.check.cache.providerUnavailable': 'Cacheleverantör otillgänglig.',
  'monitoring.check.http.badStatus': 'HTTP {{status}} svar.',
  'monitoring.check.http.timeout': 'Begäran fick timeout.',
  'monitoring.check.http.degraded':
    'Svarstid {{latencyMs}}ms överskred tröskeln {{thresholdMs}}ms.',
  'monitoring.check.bond.notBonded': "Anslutningen '{{bondType}}' är inte registrerad.",
  'monitoring.check.timedOut': 'Kontrollen fick timeout efter {{timeoutMs}}ms.',
}
