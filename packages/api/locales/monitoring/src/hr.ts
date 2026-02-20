import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Croatian. */
export const hr: MonitoringTranslations = {
  'monitoring.error.noProvider':
    'Pružatelj nadzora nije konfiguriran. Prvo pozovite setProvider().',
  'monitoring.check.database.notBonded': 'Veza s bazom podataka nije konfigurirana.',
  'monitoring.check.database.poolUnavailable': 'Baza podataka pool nije dostupan.',
  'monitoring.check.cache.notBonded': 'Veza s predmemorijom nije konfigurirana.',
  'monitoring.check.cache.providerUnavailable': 'Pružatelj predmemorije nije dostupan.',
  'monitoring.check.http.badStatus': 'HTTP {{status}} odgovor.',
  'monitoring.check.http.timeout': 'Zahtjev je istekao.',
  'monitoring.check.http.degraded':
    'Vrijeme odgovora {{latencyMs}}ms premašilo prag {{thresholdMs}}ms.',
  'monitoring.check.bond.notBonded': "Veza '{{bondType}}' nije registrirana.",
  'monitoring.check.timedOut': 'Provjera je istekla nakon {{timeoutMs}}ms.',
}
