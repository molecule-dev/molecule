import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Tamil. */
export const ta: MonitoringTranslations = {
  'monitoring.error.noProvider':
    'மானிட்டரிஂக் வழங்குநர் கான்பிகர் செய்யப்படவில்லை. முதலில் setProvider() அழைக்கவும்.',
  'monitoring.check.database.notBonded': 'தரவுத்தள பாண்ட் கான்பிகர் செய்யப்படவில்லை.',
  'monitoring.check.database.poolUnavailable': 'தரவுத்தள குளம் கிடைக்கவில்லை.',
  'monitoring.check.cache.notBonded': 'கேச் பாண்ட் கான்பிகர் செய்யப்படவில்லை.',
  'monitoring.check.cache.providerUnavailable': 'கேச் வழங்குநர் கிடைக்கவில்லை.',
  'monitoring.check.http.badStatus': 'HTTP {{status}} பதில்.',
  'monitoring.check.http.timeout': 'கோரிக்கை காலாவதியானது.',
  'monitoring.check.http.degraded':
    'பதில் நேரம் {{latencyMs}}ms வரம்பு {{thresholdMs}}ms-ஐ மீறியது.',
  'monitoring.check.bond.notBonded': "Bond '{{bondType}}' பதிவு செய்யப்படவில்லை.",
  'monitoring.check.timedOut': '{{timeoutMs}}ms-க்குப் பிறகு சோதனை காலாவதியானது.',
}
