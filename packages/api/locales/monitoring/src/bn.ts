import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Bengali. */
export const bn: MonitoringTranslations = {
  'monitoring.error.noProvider':
    'মনিটরিং প্রদানকারী কনফিগার করা হয়নি। প্রথমে setProvider() কল করুন।',
  'monitoring.check.database.notBonded': 'ডেটাবেস বন্ড কনফিগার করা হয়নি।',
  'monitoring.check.database.poolUnavailable': 'ডেটাবেস পুল অনুপলব্ধ।',
  'monitoring.check.cache.notBonded': 'ক্যাশ বন্ড কনফিগার করা হয়নি।',
  'monitoring.check.cache.providerUnavailable': 'ক্যাশ প্রদানকারী অনুপলব্ধ।',
  'monitoring.check.http.badStatus': 'HTTP {{status}} প্রতিক্রিয়া।',
  'monitoring.check.http.timeout': 'অনুরোধের সময় শেষ হয়েছে।',
  'monitoring.check.http.degraded':
    'প্রতিক্রিয়া সময় {{latencyMs}}ms সীমা {{thresholdMs}}ms অতিক্রম করেছে।',
  'monitoring.check.bond.notBonded': "বন্ড '{{bondType}}' নিবন্ধিত নয়।",
  'monitoring.check.timedOut': '{{timeoutMs}}ms পরে পরীক্ষার সময় শেষ হয়েছে।',
}
