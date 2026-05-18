import type { StatusDashboardTranslations } from './types.js'

/** StatusDashboard translations for ro. */
export const ro: Partial<StatusDashboardTranslations> = {
  'statusDashboard.label.degraded': 'Degradat',
  'statusDashboard.label.down': 'Indisponibil',
  'statusDashboard.label.services': 'Servicii',
  'statusDashboard.label.uptime': 'Timp activ',
  'statusDashboard.error.noProvider': 'Furnizorul tabloului de bord de stare nu este configurat.',
  'statusDashboard.error.fetchFailed': 'Nu s-a putut prelua starea: HTTP<x> {{status}}</x>',
  'statusDashboard.label.allOperational': 'Toate sistemele funcționale',
  'statusDashboard.label.someIssues': 'Unele sisteme întâmpină probleme',
  'statusDashboard.label.majorOutage': 'Întrerupere majoră a sistemului',
  'statusDashboard.label.operational': 'Operațional',
  'statusDashboard.label.unknown': 'Necunoscut',
  'statusDashboard.label.incidents': 'Incidente',
  'statusDashboard.label.lastChecked': 'Ultima verificare<x> {{timp}}</x>',
  'statusDashboard.label.latency': '{{Domnișoară}} Domnișoară',
  'statusDashboard.label.noIncidents': 'Nu au fost raportate incidente.',
}
