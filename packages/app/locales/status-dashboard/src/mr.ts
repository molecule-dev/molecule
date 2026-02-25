import type { StatusDashboardTranslations } from './types.js'

/** Status dashboard translations for Marathi. */
export const mr: StatusDashboardTranslations = {
  'statusDashboard.error.noProvider': 'स्थिती डॅशबोर्ड प्रदाता कॉन्फिगर केलेला नाही.',
  'statusDashboard.error.fetchFailed': 'स्थिती मिळवण्यात अयशस्वी: HTTP {{status}}',
  'statusDashboard.label.allOperational': 'सर्व प्रणाली कार्यरत आहेत',
  'statusDashboard.label.someIssues': 'काही प्रणालींमध्ये समस्या येत आहेत',
  'statusDashboard.label.majorOutage': 'मोठी प्रणाली बिघाड',
  'statusDashboard.label.operational': 'कार्यरत',
  'statusDashboard.label.degraded': 'खालावलेले',
  'statusDashboard.label.down': 'बंद',
  'statusDashboard.label.unknown': 'अज्ञात',
  'statusDashboard.label.services': 'सेवा',
  'statusDashboard.label.incidents': 'घटना',
  'statusDashboard.label.uptime': 'अपटाइम',
  'statusDashboard.label.lastChecked': 'शेवटची तपासणी {{time}}',
  'statusDashboard.label.latency': '{{ms}}ms',
  'statusDashboard.label.noIncidents': 'कोणत्याही घटना नोंदवलेल्या नाहीत.',
}
