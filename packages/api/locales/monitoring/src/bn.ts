import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Bengali. */
export const bn: MonitoringTranslations = {
  'monitoring.error.noProvider': 'Monitoring provider not configured. Call setProvider() first.',
  'monitoring.check.database.notBonded': 'Database bond not configured.',
  'monitoring.check.database.poolUnavailable': 'ডেটাবেস পুল অনুপলব্ধ।',
  'monitoring.check.cache.notBonded': 'Cache bond not configured.',
  'monitoring.check.cache.providerUnavailable': 'ক্যাশ প্রদানকারী অনুপলব্ধ।',
  'monitoring.check.http.badStatus': 'HTTP {{status}} response.',
  'monitoring.check.http.timeout': 'Request timed out.',
  'monitoring.check.http.degraded':
    'প্রতিক্রিয়া সময় {{latencyMs}}ms সীমা {{thresholdMs}}ms অতিক্রম করেছে।',
  'monitoring.check.bond.notBonded': "Bond '{{bondType}}' is not registered.",
  'monitoring.check.timedOut': '{{timeoutMs}}ms পরে পরীক্ষার সময় শেষ হয়েছে।',
}
