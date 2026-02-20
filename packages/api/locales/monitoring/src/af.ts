import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Afrikaans. */
export const af: MonitoringTranslations = {
  'monitoring.error.noProvider':
    'Moniteringsverskaffer is nie gekonfigureer nie. Roep eers setProvider() aan.',
  'monitoring.check.database.notBonded': 'Databasisverbinding is nie gekonfigureer nie.',
  'monitoring.check.database.poolUnavailable': 'Databasispoel onbeskikbaar.',
  'monitoring.check.cache.notBonded': 'Kasverbinding is nie gekonfigureer nie.',
  'monitoring.check.cache.providerUnavailable': 'Kasverskaffer onbeskikbaar.',
  'monitoring.check.http.badStatus': 'HTTP {{status}} antwoord.',
  'monitoring.check.http.timeout': 'Versoek het uitgetel.',
  'monitoring.check.http.degraded':
    'Responstyd {{latencyMs}}ms het drempel {{thresholdMs}}ms oorskry.',
  'monitoring.check.bond.notBonded': "Bond '{{bondType}}' is nie geregistreer nie.",
  'monitoring.check.timedOut': 'Kontrole het uitgetel na {{timeoutMs}}ms.',
}
