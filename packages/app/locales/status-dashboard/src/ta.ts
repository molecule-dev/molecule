import type { StatusDashboardTranslations } from './types.js'

/** Status dashboard translations for Tamil. */
export const ta: StatusDashboardTranslations = {
  'statusDashboard.error.noProvider': 'நிலை டாஷ்போர்டு வழங்குநர் கட்டமைக்கப்படவில்லை.',
  'statusDashboard.error.fetchFailed': 'நிலையைப் பெற இயலவில்லை: HTTP {{status}}',
  'statusDashboard.label.allOperational': 'அனைத்து அமைப்புகளும் இயங்குகின்றன',
  'statusDashboard.label.someIssues': 'சில அமைப்புகளில் சிக்கல்கள் உள்ளன',
  'statusDashboard.label.majorOutage': 'பெரிய அமைப்பு செயலிழப்பு',
  'statusDashboard.label.operational': 'இயங்குகிறது',
  'statusDashboard.label.degraded': 'குறைவு',
  'statusDashboard.label.down': 'நிறுத்தம்',
  'statusDashboard.label.unknown': 'தெரியாது',
  'statusDashboard.label.services': 'சேவைகள்',
  'statusDashboard.label.incidents': 'சம்பவங்கள்',
  'statusDashboard.label.uptime': 'இயக்க நேரம்',
  'statusDashboard.label.lastChecked': 'கடைசியாக சரிபார்க்கப்பட்டது {{time}}',
  'statusDashboard.label.latency': '{{ms}}ms',
  'statusDashboard.label.noIncidents': 'எந்த சம்பவங்களும் புகாரளிக்கப்படவில்லை.',
}
