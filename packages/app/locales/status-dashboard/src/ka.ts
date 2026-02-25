import type { StatusDashboardTranslations } from './types.js'

/** Status dashboard translations for Georgian. */
export const ka: StatusDashboardTranslations = {
  'statusDashboard.error.noProvider': 'სტატუსის დაფის პროვაიდერი არ არის კონფიგურირებული.',
  'statusDashboard.error.fetchFailed': 'სტატუსის მიღება ვერ მოხერხდა: HTTP {{status}}',
  'statusDashboard.label.allOperational': 'ყველა სისტემა მუშაობს',
  'statusDashboard.label.someIssues': 'ზოგიერთ სისტემას პრობლემები აქვს',
  'statusDashboard.label.majorOutage': 'სისტემის მძიმე გაუმართაობა',
  'statusDashboard.label.operational': 'მუშაობს',
  'statusDashboard.label.degraded': 'გაუარესებული',
  'statusDashboard.label.down': 'გათიშული',
  'statusDashboard.label.unknown': 'უცნობი',
  'statusDashboard.label.services': 'სერვისები',
  'statusDashboard.label.incidents': 'ინციდენტები',
  'statusDashboard.label.uptime': 'მუშაობის დრო',
  'statusDashboard.label.lastChecked': 'ბოლოს შემოწმდა {{time}}',
  'statusDashboard.label.latency': '{{ms}}ms',
  'statusDashboard.label.noIncidents': 'ინციდენტები არ არის მოხსენებული.',
}
