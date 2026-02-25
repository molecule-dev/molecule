import type { StatusDashboardTranslations } from './types.js'

/** Status dashboard translations for Amharic. */
export const am: StatusDashboardTranslations = {
  'statusDashboard.error.noProvider': 'የሁኔታ ዳሽቦርድ አቅራቢ አልተዋቀረም።',
  'statusDashboard.error.fetchFailed': 'ሁኔታን ማምጣት አልተሳካም: HTTP {{status}}',
  'statusDashboard.label.allOperational': 'ሁሉም ስርዓቶች እየሰሩ ናቸው',
  'statusDashboard.label.someIssues': 'አንዳንድ ስርዓቶች ችግር እያጋጠማቸው ነው',
  'statusDashboard.label.majorOutage': 'ዋና የስርዓት መቋረጥ',
  'statusDashboard.label.operational': 'እየሰራ ነው',
  'statusDashboard.label.degraded': 'የተዳከመ',
  'statusDashboard.label.down': 'ወድቋል',
  'statusDashboard.label.unknown': 'ያልታወቀ',
  'statusDashboard.label.services': 'አገልግሎቶች',
  'statusDashboard.label.incidents': 'ክስተቶች',
  'statusDashboard.label.uptime': 'የስራ ጊዜ',
  'statusDashboard.label.lastChecked': 'ለመጨረሻ ጊዜ የተረጋገጠው {{time}}',
  'statusDashboard.label.latency': '{{ms}}ms',
  'statusDashboard.label.noIncidents': 'ምንም ክስተቶች አልተዘገቡም።',
}
