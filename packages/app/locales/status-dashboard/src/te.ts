import type { StatusDashboardTranslations } from './types.js'

/** Status dashboard translations for Telugu. */
export const te: StatusDashboardTranslations = {
  'statusDashboard.error.noProvider': 'స్టేటస్ డాష్‌బోర్డ్ ప్రొవైడర్ కాన్ఫిగర్ చేయబడలేదు.',
  'statusDashboard.error.fetchFailed': 'స్టేటస్ పొందడంలో విఫలమైంది: HTTP {{status}}',
  'statusDashboard.label.allOperational': 'అన్ని సిస్టమ్‌లు పనిచేస్తున్నాయి',
  'statusDashboard.label.someIssues': 'కొన్ని సిస్టమ్‌లలో సమస్యలు ఎదురవుతున్నాయి',
  'statusDashboard.label.majorOutage': 'ప్రధాన సిస్టమ్ వైఫల్యం',
  'statusDashboard.label.operational': 'పనిచేస్తోంది',
  'statusDashboard.label.degraded': 'తగ్గింది',
  'statusDashboard.label.down': 'ఆగిపోయింది',
  'statusDashboard.label.unknown': 'తెలియదు',
  'statusDashboard.label.services': 'సేవలు',
  'statusDashboard.label.incidents': 'సంఘటనలు',
  'statusDashboard.label.uptime': 'అప్‌టైమ్',
  'statusDashboard.label.lastChecked': 'చివరిగా తనిఖీ చేయబడింది {{time}}',
  'statusDashboard.label.latency': '{{ms}}ms',
  'statusDashboard.label.noIncidents': 'ఏ సంఘటనలు నివేదించబడలేదు.',
}
