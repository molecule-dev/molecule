import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Kannada. */
export const kn: MonitoringTranslations = {
  'monitoring.error.noProvider': 'Monitoring provider not configured. Call setProvider() first.',
  'monitoring.check.database.notBonded': 'Database bond not configured.',
  'monitoring.check.database.poolUnavailable': 'ಡೇಟಾಬೇಸ್ ಪೂಲ್ ಲಭ್ಯವಿಲ್ಲ.',
  'monitoring.check.cache.notBonded': 'Cache bond not configured.',
  'monitoring.check.cache.providerUnavailable': 'ಕ್ಯಾಶ್ ಒದಗಿಸುವವರು ಲಭ್ಯವಿಲ್ಲ.',
  'monitoring.check.http.badStatus': 'HTTP {{status}} response.',
  'monitoring.check.http.timeout': 'Request timed out.',
  'monitoring.check.http.degraded':
    'ಪ್ರತಿಕ್ರಿಯೆ ಸಮಯ {{latencyMs}}ms ಮಿತಿ {{thresholdMs}}ms ಅನ್ನು ಮೀರಿದೆ.',
  'monitoring.check.bond.notBonded': "Bond '{{bondType}}' is not registered.",
  'monitoring.check.timedOut': '{{timeoutMs}}ms ನಂತರ ಪರಿಶೀಲನೆ ಸಮಯ ಮೀರಿದೆ.',
}
