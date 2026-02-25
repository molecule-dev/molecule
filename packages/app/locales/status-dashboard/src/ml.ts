import type { StatusDashboardTranslations } from './types.js'

/** Status dashboard translations for Malayalam. */
export const ml: StatusDashboardTranslations = {
  'statusDashboard.error.noProvider': 'സ്റ്റാറ്റസ് ഡാഷ്ബോർഡ് പ്രൊവൈഡർ കോൺഫിഗർ ചെയ്തിട്ടില്ല.',
  'statusDashboard.error.fetchFailed':
    'സ്റ്റാറ്റസ് ലഭ്യമാക്കുന്നതിൽ പരാജയപ്പെട്ടു: HTTP {{status}}',
  'statusDashboard.label.allOperational': 'എല്ലാ സിസ്റ്റങ്ങളും പ്രവർത്തിക്കുന്നു',
  'statusDashboard.label.someIssues': 'ചില സിസ്റ്റങ്ങളിൽ പ്രശ്നങ്ങൾ അനുഭവപ്പെടുന്നു',
  'statusDashboard.label.majorOutage': 'വലിയ സിസ്റ്റം തകരാർ',
  'statusDashboard.label.operational': 'പ്രവർത്തിക്കുന്നു',
  'statusDashboard.label.degraded': 'താഴ്ന്ന നിലയിൽ',
  'statusDashboard.label.down': 'പ്രവർത്തനരഹിതം',
  'statusDashboard.label.unknown': 'അജ്ഞാതം',
  'statusDashboard.label.services': 'സേവനങ്ങൾ',
  'statusDashboard.label.incidents': 'സംഭവങ്ങൾ',
  'statusDashboard.label.uptime': 'അപ്ടൈം',
  'statusDashboard.label.lastChecked': 'അവസാനം പരിശോധിച്ചത് {{time}}',
  'statusDashboard.label.latency': '{{ms}}ms',
  'statusDashboard.label.noIncidents': 'സംഭവങ്ങൾ ഒന്നും റിപ്പോർട്ട് ചെയ്തിട്ടില്ല.',
}
