import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Czech. */
export const cs: MonitoringTranslations = {
  'monitoring.error.noProvider':
    'Poskytovatel monitoringu není nakonfigurován. Nejprve zavolejte setProvider().',
  'monitoring.check.database.notBonded': 'Připojení k databázi není nakonfigurováno.',
  'monitoring.check.database.poolUnavailable': 'Fond databáze není dostupný.',
  'monitoring.check.cache.notBonded': 'Připojení ke cache není nakonfigurováno.',
  'monitoring.check.cache.providerUnavailable': 'Poskytovatel vyrovnávací paměti není dostupný.',
  'monitoring.check.http.badStatus': 'HTTP {{status}} odpověď.',
  'monitoring.check.http.timeout': 'Časový limit požadavku vypršel.',
  'monitoring.check.http.degraded':
    'Doba odezvy {{latencyMs}}ms překročila práh {{thresholdMs}}ms.',
  'monitoring.check.bond.notBonded': "Vazba '{{bondType}}' není zaregistrována.",
  'monitoring.check.timedOut': 'Kontrola vypršela po {{timeoutMs}}ms.',
}
