import type { StatusDashboardTranslations } from './types.js'

/** Status dashboard translations for Albanian. */
export const sq: StatusDashboardTranslations = {
  'statusDashboard.error.noProvider': 'Ofruesi i panelit të statusit nuk është konfiguruar.',
  'statusDashboard.error.fetchFailed': 'Dështoi marrja e statusit: HTTP {{status}}',
  'statusDashboard.label.allOperational': 'Të gjitha sistemet janë funksionale',
  'statusDashboard.label.someIssues': 'Disa sisteme po përjetojnë probleme',
  'statusDashboard.label.majorOutage': 'Ndërprerje e madhe e sistemit',
  'statusDashboard.label.operational': 'Funksional',
  'statusDashboard.label.degraded': 'I degraduar',
  'statusDashboard.label.down': 'Jashtë funksionimit',
  'statusDashboard.label.unknown': 'I panjohur',
  'statusDashboard.label.services': 'Shërbimet',
  'statusDashboard.label.incidents': 'Incidentet',
  'statusDashboard.label.uptime': 'Koha e punës',
  'statusDashboard.label.lastChecked': 'Kontrolluar për herë të fundit {{time}}',
  'statusDashboard.label.latency': '{{ms}}ms',
  'statusDashboard.label.noIncidents': 'Nuk ka incidente të raportuara.',
}
