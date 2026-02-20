import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Greek. */
export const el: MonitoringTranslations = {
  'monitoring.error.noProvider':
    'Ο πάροχος παρακολούθησης δεν έχει ρυθμιστεί. Καλέστε πρώτα setProvider().',
  'monitoring.check.database.notBonded': 'Η σύνδεση βάσης δεδομένων δεν έχει ρυθμιστεί.',
  'monitoring.check.database.poolUnavailable': 'Η ομάδα βάσης δεδομένων δεν είναι διαθέσιμη.',
  'monitoring.check.cache.notBonded': 'Η σύνδεση cache δεν έχει ρυθμιστεί.',
  'monitoring.check.cache.providerUnavailable': 'Ο πάροχος κρυφής μνήμης δεν είναι διαθέσιμος.',
  'monitoring.check.http.badStatus': 'Απόκριση HTTP {{status}}.',
  'monitoring.check.http.timeout': 'Το αίτημα έληξε.',
  'monitoring.check.http.degraded':
    'Ο χρόνος απόκρισης {{latencyMs}}ms υπερέβη το όριο {{thresholdMs}}ms.',
  'monitoring.check.bond.notBonded': "Η σύνδεση '{{bondType}}' δεν είναι καταχωρημένη.",
  'monitoring.check.timedOut': 'Ο έλεγχος έληξε μετά από {{timeoutMs}}ms.',
}
