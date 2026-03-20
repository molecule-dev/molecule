import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Sinhala. */
export const si: MonitoringTranslations = {
  'monitoring.error.noProvider': 'මිනිටරිං සපයුම්කරු සැකසීම නැත. පළමුව setProvider() කියන්න.',
  'monitoring.check.database.notBonded': 'දත්ත සමුදාය බෙන්ඩය සැකසීම නැත.',
  'monitoring.check.database.poolUnavailable': 'දත්ත සමුදාය සංචිතය ලබා ගත නොහැක.',
  'monitoring.check.cache.notBonded': 'හැඹිලි බෙන්ඩය සැකසීම නැත.',
  'monitoring.check.cache.providerUnavailable': 'හැඹිලි සැපයුම්කරු ලබා ගත නොහැක.',
  'monitoring.check.http.badStatus': 'HTTP {{status}} ප්‍රතිචාරය.',
  'monitoring.check.http.timeout': 'ඉල්ලීම කාල ඉකුත් විය.',
  'monitoring.check.http.degraded':
    'ප්‍රතිචාර කාලය {{latencyMs}}ms සීමාව {{thresholdMs}}ms ඉක්මවා ඇත.',
  'monitoring.check.bond.notBonded': "Bond '{{bondType}}' නෙජිස්ටර් නැත.",
  'monitoring.check.timedOut': '{{timeoutMs}}ms පසු පරීක්ෂාව කල් ඉකුත් විය.',
}
