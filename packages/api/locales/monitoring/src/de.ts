import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for German. */
export const de: MonitoringTranslations = {
  'monitoring.error.noProvider':
    'Monitoring-Anbieter nicht konfiguriert. Rufen Sie zuerst setProvider() auf.',
  'monitoring.check.database.notBonded': 'Datenbankverbindung nicht konfiguriert.',
  'monitoring.check.database.poolUnavailable': 'Datenbankpool nicht verfügbar.',
  'monitoring.check.cache.notBonded': 'Cache-Verbindung nicht konfiguriert.',
  'monitoring.check.cache.providerUnavailable': 'Cache-Anbieter nicht verfügbar.',
  'monitoring.check.http.badStatus': 'HTTP {{status}} Antwort.',
  'monitoring.check.http.timeout': 'Zeitüberschreitung der Anfrage.',
  'monitoring.check.http.degraded':
    'Antwortzeit {{latencyMs}}ms überschritt Schwellenwert {{thresholdMs}}ms.',
  'monitoring.check.bond.notBonded': "Bond '{{bondType}}' ist nicht registriert.",
  'monitoring.check.timedOut': 'Prüfung nach {{timeoutMs}}ms abgelaufen.',
}
