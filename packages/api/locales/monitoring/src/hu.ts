import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Hungarian. */
export const hu: MonitoringTranslations = {
  'monitoring.error.noProvider':
    'A figyelési szolgáltató nincs konfigurálva. Először hívja meg a setProvider() függvényt.',
  'monitoring.check.database.notBonded': 'Az adatbázis-kapcsolat nincs konfigurálva.',
  'monitoring.check.database.poolUnavailable': 'Az adatbázis pool nem elérhető.',
  'monitoring.check.cache.notBonded': 'A gyorsítótár-kapcsolat nincs konfigurálva.',
  'monitoring.check.cache.providerUnavailable': 'A gyorsítótár szolgáltató nem elérhető.',
  'monitoring.check.http.badStatus': 'HTTP {{status}} válasz.',
  'monitoring.check.http.timeout': 'A kérés időtúllépés miatt megszakadt.',
  'monitoring.check.http.degraded':
    'A válaszidő {{latencyMs}}ms meghaladta a küszöbértéket {{thresholdMs}}ms.',
  'monitoring.check.bond.notBonded': "A '{{bondType}}' kapcsolat nincs regisztrálva.",
  'monitoring.check.timedOut': 'Az ellenőrzés időtúllépés {{timeoutMs}}ms után.',
}
