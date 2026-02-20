import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Polish. */
export const pl: MonitoringTranslations = {
  'monitoring.error.noProvider':
    'Dostawca monitorowania nie jest skonfigurowany. Najpierw wywołaj setProvider().',
  'monitoring.check.database.notBonded': 'Połączenie z bazą danych nie jest skonfigurowane.',
  'monitoring.check.database.poolUnavailable': 'Pula bazy danych niedostępna.',
  'monitoring.check.cache.notBonded': 'Połączenie z pamięcią podręczną nie jest skonfigurowane.',
  'monitoring.check.cache.providerUnavailable': 'Dostawca pamięci podręcznej niedostępny.',
  'monitoring.check.http.badStatus': 'Odpowiedź HTTP {{status}}.',
  'monitoring.check.http.timeout': 'Przekroczono limit czasu żądania.',
  'monitoring.check.http.degraded':
    'Czas odpowiedzi {{latencyMs}}ms przekroczył próg {{thresholdMs}}ms.',
  'monitoring.check.bond.notBonded': "Połączenie '{{bondType}}' nie jest zarejestrowane.",
  'monitoring.check.timedOut': 'Sprawdzenie przekroczyło limit czasu po {{timeoutMs}}ms.',
}
