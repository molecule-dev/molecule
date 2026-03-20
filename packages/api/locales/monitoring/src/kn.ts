import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Kannada. */
export const kn: MonitoringTranslations = {
  'monitoring.error.noProvider':
    'ಮಾನಿಟರಿಂಗ್ ಪೋರೈಕೆದಾರರು ಕಾನ್ಫಿಗರ್ ಆಗಿಲ್ಲ. ಮೊದಲು setProvider() ಕರೆ ಮಾಡಿ.',
  'monitoring.check.database.notBonded': 'ಡೇಟಾಬೇಸ್ ಬಾಂಡ್ ಕಾನ್ಫಿಗರ್ ಆಗಿಲ್ಲ.',
  'monitoring.check.database.poolUnavailable': 'ಡೇಟಾಬೇಸ್ ಪೂಲ್ ಲಭ್ಯವಿಲ್ಲ.',
  'monitoring.check.cache.notBonded': 'ಕ್ಯಾಶ್ ಬಾಂಡ್ ಕಾನ್ಫಿಗರ್ ಆಗಿಲ್ಲ.',
  'monitoring.check.cache.providerUnavailable': 'ಕ್ಯಾಶ್ ಒದಗಿಸುವವರು ಲಭ್ಯವಿಲ್ಲ.',
  'monitoring.check.http.badStatus': 'HTTP {{status}} ಪ್ರತಿಕ್ರಿಯೆ.',
  'monitoring.check.http.timeout': 'ವಿನಂತಿ ಸಮಯ ಮೀರಿದೆ.',
  'monitoring.check.http.degraded':
    'ಪ್ರತಿಕ್ರಿಯೆ ಸಮಯ {{latencyMs}}ms ಮಿತಿ {{thresholdMs}}ms ಅನ್ನು ಮೀರಿದೆ.',
  'monitoring.check.bond.notBonded': "Bond '{{bondType}}' ನೋಂದಾಯಿಸಲಾಗಿಲ್ಲ.",
  'monitoring.check.timedOut': '{{timeoutMs}}ms ನಂತರ ಪರಿಶೀಲನೆ ಸಮಯ ಮೀರಿದೆ.',
}
