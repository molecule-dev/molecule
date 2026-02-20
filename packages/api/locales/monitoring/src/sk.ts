import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Slovak. */
export const sk: MonitoringTranslations = {
  'monitoring.error.noProvider':
    'Poskytovateľ monitorovania nie je nakonfigurovaný. Najprv zavolajte setProvider().',
  'monitoring.check.database.notBonded': 'Pripojenie k databáze nie je nakonfigurované.',
  'monitoring.check.database.poolUnavailable': 'Fond databázy nie je dostupný.',
  'monitoring.check.cache.notBonded': 'Pripojenie ku cache nie je nakonfigurované.',
  'monitoring.check.cache.providerUnavailable': 'Poskytovateľ vyrovnávacej pamäte nie je dostupný.',
  'monitoring.check.http.badStatus': 'HTTP {{status}} odpoveď.',
  'monitoring.check.http.timeout': 'Časový limit požiadavky vypršal.',
  'monitoring.check.http.degraded':
    'Doba odozvy {{latencyMs}}ms prekročila prah {{thresholdMs}}ms.',
  'monitoring.check.bond.notBonded': "Väzba '{{bondType}}' nie je zaregistrovaná.",
  'monitoring.check.timedOut': 'Kontrola vypršala po {{timeoutMs}}ms.',
}
