import type { StatusDashboardTranslations } from './types.js'

/** Status dashboard translations for Khmer. */
export const km: StatusDashboardTranslations = {
  'statusDashboard.error.noProvider': 'អ្នកផ្តល់ផ្ទាំងស្ថានភាពមិនត្រូវបានកំណត់រចនាសម្ព័ន្ធទេ។',
  'statusDashboard.error.fetchFailed': 'បរាជ័យក្នុងការទាញយកស្ថានភាព: HTTP {{status}}',
  'statusDashboard.label.allOperational': 'ប្រព័ន្ធទាំងអស់កំពុងដំណើរការ',
  'statusDashboard.label.someIssues': 'ប្រព័ន្ធមួយចំនួនកំពុងជួបបញ្ហា',
  'statusDashboard.label.majorOutage': 'ការដាច់ប្រព័ន្ធធំ',
  'statusDashboard.label.operational': 'កំពុងដំណើរការ',
  'statusDashboard.label.degraded': 'ថយចុះ',
  'statusDashboard.label.down': 'មិនដំណើរការ',
  'statusDashboard.label.unknown': 'មិនស្គាល់',
  'statusDashboard.label.services': 'សេវាកម្ម',
  'statusDashboard.label.incidents': 'ឧប្បត្តិហេតុ',
  'statusDashboard.label.uptime': 'រយៈពេលដំណើរការ',
  'statusDashboard.label.lastChecked': 'ពិនិត្យចុងក្រោយ {{time}}',
  'statusDashboard.label.latency': '{{ms}}ms',
  'statusDashboard.label.noIncidents': 'គ្មានឧប្បត្តិហេតុត្រូវបានរាយការណ៍។',
}
