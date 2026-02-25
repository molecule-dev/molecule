import type { StatusDashboardTranslations } from './types.js'

/** Status dashboard translations for Kazakh. */
export const kk: StatusDashboardTranslations = {
  'statusDashboard.error.noProvider': 'Күй тақтасының провайдері конфигурацияланбаған.',
  'statusDashboard.error.fetchFailed': 'Күйді алу сәтсіз аяқталды: HTTP {{status}}',
  'statusDashboard.label.allOperational': 'Барлық жүйелер жұмыс істейді',
  'statusDashboard.label.someIssues': 'Кейбір жүйелерде ақаулар бар',
  'statusDashboard.label.majorOutage': 'Жүйенің маңызды үзілісі',
  'statusDashboard.label.operational': 'Жұмыс істейді',
  'statusDashboard.label.degraded': 'Нашарлаған',
  'statusDashboard.label.down': 'Жұмыс істемейді',
  'statusDashboard.label.unknown': 'Белгісіз',
  'statusDashboard.label.services': 'Қызметтер',
  'statusDashboard.label.incidents': 'Оқиғалар',
  'statusDashboard.label.uptime': 'Жұмыс уақыты',
  'statusDashboard.label.lastChecked': 'Соңғы тексеру {{time}}',
  'statusDashboard.label.latency': '{{ms}}ms',
  'statusDashboard.label.noIncidents': 'Ешқандай оқиға хабарланбаған.',
}
