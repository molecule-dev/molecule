import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Tamil. */
export const ta: MonitoringTranslations = {
  'monitoring.error.noProvider': 'Monitoring provider not configured. Call setProvider() first.',
  'monitoring.check.database.notBonded': 'Database bond not configured.',
  'monitoring.check.database.poolUnavailable': 'தரவுத்தள குளம் கிடைக்கவில்லை.',
  'monitoring.check.cache.notBonded': 'Cache bond not configured.',
  'monitoring.check.cache.providerUnavailable': 'கேச் வழங்குநர் கிடைக்கவில்லை.',
  'monitoring.check.http.badStatus': 'HTTP {{status}} response.',
  'monitoring.check.http.timeout': 'Request timed out.',
  'monitoring.check.http.degraded':
    'பதில் நேரம் {{latencyMs}}ms வரம்பு {{thresholdMs}}ms-ஐ மீறியது.',
  'monitoring.check.bond.notBonded': "Bond '{{bondType}}' is not registered.",
  'monitoring.check.timedOut': '{{timeoutMs}}ms-க்குப் பிறகு சோதனை காலாவதியானது.',
}
