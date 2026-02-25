import type { StatusDashboardTranslations } from './types.js'

/** Status dashboard translations for Nepali. */
export const ne: StatusDashboardTranslations = {
  'statusDashboard.error.noProvider': 'स्थिति ड्यासबोर्ड प्रदायक कन्फिगर गरिएको छैन।',
  'statusDashboard.error.fetchFailed': 'स्थिति प्राप्त गर्न असफल: HTTP {{status}}',
  'statusDashboard.label.allOperational': 'सबै प्रणालीहरू चालु छन्',
  'statusDashboard.label.someIssues': 'केही प्रणालीहरूमा समस्या आइरहेको छ',
  'statusDashboard.label.majorOutage': 'ठूलो प्रणाली विफलता',
  'statusDashboard.label.operational': 'चालु',
  'statusDashboard.label.degraded': 'गिरावट',
  'statusDashboard.label.down': 'बन्द',
  'statusDashboard.label.unknown': 'अज्ञात',
  'statusDashboard.label.services': 'सेवाहरू',
  'statusDashboard.label.incidents': 'घटनाहरू',
  'statusDashboard.label.uptime': 'अपटाइम',
  'statusDashboard.label.lastChecked': 'अन्तिम जाँच {{time}}',
  'statusDashboard.label.latency': '{{ms}}ms',
  'statusDashboard.label.noIncidents': 'कुनै घटना रिपोर्ट गरिएको छैन।',
}
