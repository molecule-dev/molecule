import type { StatusDashboardTranslations } from './types.js'

/** Status dashboard translations for Estonian. */
export const et: StatusDashboardTranslations = {
  'statusDashboard.error.noProvider': 'Oleku juhtpaneeli pakkuja pole seadistatud.',
  'statusDashboard.error.fetchFailed': 'Oleku toomine ebaõnnestus: HTTP {{status}}',
  'statusDashboard.label.allOperational': 'Kõik süsteemid töötavad',
  'statusDashboard.label.someIssues': 'Mõnel süsteemil esineb probleeme',
  'statusDashboard.label.majorOutage': 'Suur süsteemikatkestus',
  'statusDashboard.label.operational': 'Töötab',
  'statusDashboard.label.degraded': 'Halvenenud',
  'statusDashboard.label.down': 'Maas',
  'statusDashboard.label.unknown': 'Teadmata',
  'statusDashboard.label.services': 'Teenused',
  'statusDashboard.label.incidents': 'Intsidendid',
  'statusDashboard.label.uptime': 'Tööaeg',
  'statusDashboard.label.lastChecked': 'Viimati kontrollitud {{time}}',
  'statusDashboard.label.latency': '{{ms}}ms',
  'statusDashboard.label.noIncidents': 'Ühtegi intsidenti pole teatatud.',
}
