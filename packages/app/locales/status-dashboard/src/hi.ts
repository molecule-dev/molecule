import type { StatusDashboardTranslations } from './types.js'

/** Status dashboard translations for Hindi. */
export const hi: StatusDashboardTranslations = {
  'statusDashboard.error.noProvider': 'स्थिति डैशबोर्ड प्रदाता कॉन्फ़िगर नहीं किया गया है।',
  'statusDashboard.error.fetchFailed': 'स्थिति प्राप्त करने में विफल: HTTP {{status}}',
  'statusDashboard.label.allOperational': 'सभी सिस्टम चालू हैं',
  'statusDashboard.label.someIssues': 'कुछ सिस्टम में समस्याएं आ रही हैं',
  'statusDashboard.label.majorOutage': 'प्रमुख सिस्टम आउटेज',
  'statusDashboard.label.operational': 'चालू',
  'statusDashboard.label.degraded': 'गिरावट',
  'statusDashboard.label.down': 'बंद',
  'statusDashboard.label.unknown': 'अज्ञात',
  'statusDashboard.label.services': 'सेवाएं',
  'statusDashboard.label.incidents': 'घटनाएं',
  'statusDashboard.label.uptime': 'अपटाइम',
  'statusDashboard.label.lastChecked': 'अंतिम जांच {{time}}',
  'statusDashboard.label.latency': '{{ms}}ms',
  'statusDashboard.label.noIncidents': 'कोई घटना रिपोर्ट नहीं की गई।',
}
