import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Bosnian. */
export const bs: MonitoringTranslations = {
  'monitoring.error.noProvider':
    'Provajder za monitoring nije konfigurisan. Prvo pozovite setProvider().',
  'monitoring.check.database.notBonded': 'Veza s bazom podataka nije konfigurisana.',
  'monitoring.check.database.poolUnavailable': 'Baza podataka pool nije dostupan.',
  'monitoring.check.cache.notBonded': 'Veza s kešom nije konfigurisana.',
  'monitoring.check.cache.providerUnavailable': 'Keš provajder nije dostupan.',
  'monitoring.check.http.badStatus': 'HTTP {{status}} odgovor.',
  'monitoring.check.http.timeout': 'Zahtjev je istekao.',
  'monitoring.check.http.degraded':
    'Vrijeme odgovora {{latencyMs}}ms premašilo prag {{thresholdMs}}ms.',
  'monitoring.check.bond.notBonded': "Veza '{{bondType}}' nije registrovana.",
  'monitoring.check.timedOut': 'Provjera je istekla nakon {{timeoutMs}}ms.',
}
