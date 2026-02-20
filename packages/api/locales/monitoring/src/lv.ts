import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Latvian. */
export const lv: MonitoringTranslations = {
  'monitoring.error.noProvider':
    'Uzraudzības nodrošinātājs nav konfigurēts. Vispirms izsauciet setProvider().',
  'monitoring.check.database.notBonded': 'Datu bāzes savienojums nav konfigurēts.',
  'monitoring.check.database.poolUnavailable': 'Datubāzes pūls nav pieejams.',
  'monitoring.check.cache.notBonded': 'Kešatmiņas savienojums nav konfigurēts.',
  'monitoring.check.cache.providerUnavailable': 'Kešatmiņas nodrošinātājs nav pieejams.',
  'monitoring.check.http.badStatus': 'HTTP {{status}} atbilde.',
  'monitoring.check.http.timeout': 'Pieprasījuma laiks beidzās.',
  'monitoring.check.http.degraded':
    'Atbildes laiks {{latencyMs}}ms pārsniedza slieksni {{thresholdMs}}ms.',
  'monitoring.check.bond.notBonded': "Savienojums '{{bondType}}' nav reģistrēts.",
  'monitoring.check.timedOut': 'Pārbaude iztecēja pēc {{timeoutMs}}ms.',
}
