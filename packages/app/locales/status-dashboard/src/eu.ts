import type { StatusDashboardTranslations } from './types.js'

/** Status dashboard translations for Basque. */
export const eu: StatusDashboardTranslations = {
  'statusDashboard.error.noProvider': 'Egoera-panelaren hornitzailea ez dago konfiguratuta.',
  'statusDashboard.error.fetchFailed': 'Ezin izan da egoera eskuratu: HTTP {{status}}',
  'statusDashboard.label.allOperational': 'Sistema guztiak martxan',
  'statusDashboard.label.someIssues': 'Sistema batzuek arazoak dituzte',
  'statusDashboard.label.majorOutage': 'Sistemaren etenaldi handia',
  'statusDashboard.label.operational': 'Martxan',
  'statusDashboard.label.degraded': 'Degradatuta',
  'statusDashboard.label.down': 'Geldituta',
  'statusDashboard.label.unknown': 'Ezezaguna',
  'statusDashboard.label.services': 'Zerbitzuak',
  'statusDashboard.label.incidents': 'Gertaerak',
  'statusDashboard.label.uptime': 'Aktibotasun-denbora',
  'statusDashboard.label.lastChecked': 'Azken egiaztapena {{time}}',
  'statusDashboard.label.latency': '{{ms}}ms',
  'statusDashboard.label.noIncidents': 'Ez da gertaerarik jakinarazi.',
}
