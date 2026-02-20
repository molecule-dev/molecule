import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Sinhala. */
export const si: MonitoringTranslations = {
  'monitoring.error.noProvider': 'Monitoring provider not configured. Call setProvider() first.',
  'monitoring.check.database.notBonded': 'Database bond not configured.',
  'monitoring.check.database.poolUnavailable': 'දත්ත සමුදාය සංචිතය ලබා ගත නොහැක.',
  'monitoring.check.cache.notBonded': 'Cache bond not configured.',
  'monitoring.check.cache.providerUnavailable': 'හැඹිලි සැපයුම්කරු ලබා ගත නොහැක.',
  'monitoring.check.http.badStatus': 'HTTP {{status}} response.',
  'monitoring.check.http.timeout': 'Request timed out.',
  'monitoring.check.http.degraded':
    'ප්‍රතිචාර කාලය {{latencyMs}}ms සීමාව {{thresholdMs}}ms ඉක්මවා ඇත.',
  'monitoring.check.bond.notBonded': "Bond '{{bondType}}' is not registered.",
  'monitoring.check.timedOut': '{{timeoutMs}}ms පසු පරීක්ෂාව කල් ඉකුත් විය.',
}
