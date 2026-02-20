import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Romanian. */
export const ro: MonitoringTranslations = {
  'monitoring.error.noProvider':
    'Furnizorul de monitorizare nu este configurat. Apelați mai întâi setProvider().',
  'monitoring.check.database.notBonded': 'Conexiunea la baza de date nu este configurată.',
  'monitoring.check.database.poolUnavailable': 'Pool-ul bazei de date indisponibil.',
  'monitoring.check.cache.notBonded': 'Conexiunea cache nu este configurată.',
  'monitoring.check.cache.providerUnavailable': 'Furnizorul de cache indisponibil.',
  'monitoring.check.http.badStatus': 'Răspuns HTTP {{status}}.',
  'monitoring.check.http.timeout': 'Cererea a expirat.',
  'monitoring.check.http.degraded':
    'Timpul de răspuns {{latencyMs}}ms a depășit pragul {{thresholdMs}}ms.',
  'monitoring.check.bond.notBonded': "Conexiunea '{{bondType}}' nu este înregistrată.",
  'monitoring.check.timedOut': 'Verificarea a expirat după {{timeoutMs}}ms.',
}
