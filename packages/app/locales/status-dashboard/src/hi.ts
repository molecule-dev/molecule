import type { StatusDashboardTranslations } from './types.js'

/** StatusDashboard translations for hi. */
export const hi: Partial<StatusDashboardTranslations> = {
  'statusDashboard.label.operational': 'परिचालन',
  'statusDashboard.label.degraded': 'कमज़ोर',
  'statusDashboard.label.down': 'बंद',
  'statusDashboard.label.unknown': 'अज्ञात',
  'statusDashboard.label.services': 'सेवाएं',
  'statusDashboard.label.incidents': 'घटनाएँ',
  'statusDashboard.label.uptime': 'अपटाइम',
  'statusDashboard.error.noProvider': 'स्टेटस डैशबोर्ड प्रदाता कॉन्फ़िगर नहीं किया गया है।',
  'statusDashboard.error.fetchFailed': 'स्थिति प्राप्त करने में विफल: HTTP<x> {{स्थिति}}</x>',
  'statusDashboard.label.allOperational': 'सभी प्रणालियाँ चालू हैं',
  'statusDashboard.label.someIssues': 'कुछ सिस्टमों में समस्याएँ आ रही हैं।',
  'statusDashboard.label.majorOutage': 'प्रमुख सिस्टम व्यवधान',
  'statusDashboard.label.lastChecked': 'पिछली बार जाँच की गई<x> {{समय}}</x>',
  'statusDashboard.label.latency': '{{एमएस}} एमएस',
  'statusDashboard.label.noIncidents': 'कोई घटना दर्ज नहीं की गई।',
}
