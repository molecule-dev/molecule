import type { StatusDashboardTranslations } from './types.js'

/** Status dashboard translations for Hebrew. */
export const he: StatusDashboardTranslations = {
  'statusDashboard.error.fetchFailed': 'נכשל באחזור המצב: HTTP {{status}}',
  'statusDashboard.label.allOperational': 'כל המערכות פועלות',
  'statusDashboard.label.someIssues': 'חלק מהמערכות חוות בעיות',
  'statusDashboard.label.majorOutage': 'תקלה מרכזית במערכת',
  'statusDashboard.label.operational': 'פעיל',
  'statusDashboard.label.degraded': 'מופחת',
  'statusDashboard.label.down': 'לא פעיל',
  'statusDashboard.label.unknown': 'לא ידוע',
  'statusDashboard.label.services': 'שירותים',
  'statusDashboard.label.incidents': 'תקריות',
  'statusDashboard.label.uptime': 'זמן פעילות',
  'statusDashboard.label.lastChecked': 'נבדק לאחרונה {{time}}',
  'statusDashboard.label.latency': '{{ms}}ms',
  'statusDashboard.label.noIncidents': 'לא דווחו תקריות.',
  'statusDashboard.error.noProvider':
    'ספק לוח מחוונים של סטטוס לא הוגדר. יש לקשר ספק לוח מחוונים של סטטוס תחילה.',
}
