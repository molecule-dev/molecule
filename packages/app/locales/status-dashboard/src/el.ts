import type { StatusDashboardTranslations } from './types.js'

/** Status dashboard translations for Greek. */
export const el: StatusDashboardTranslations = {
  'statusDashboard.error.noProvider': 'Ο πάροχος πίνακα κατάστασης δεν έχει ρυθμιστεί.',
  'statusDashboard.error.fetchFailed': 'Αποτυχία ανάκτησης κατάστασης: HTTP {{status}}',
  'statusDashboard.label.allOperational': 'Όλα τα συστήματα λειτουργούν κανονικά',
  'statusDashboard.label.someIssues': 'Ορισμένα συστήματα αντιμετωπίζουν προβλήματα',
  'statusDashboard.label.majorOutage': 'Σοβαρή διακοπή συστήματος',
  'statusDashboard.label.operational': 'Λειτουργικό',
  'statusDashboard.label.degraded': 'Υποβαθμισμένο',
  'statusDashboard.label.down': 'Εκτός λειτουργίας',
  'statusDashboard.label.unknown': 'Άγνωστο',
  'statusDashboard.label.services': 'Υπηρεσίες',
  'statusDashboard.label.incidents': 'Συμβάντα',
  'statusDashboard.label.uptime': 'Χρόνος λειτουργίας',
  'statusDashboard.label.lastChecked': 'Τελευταίος έλεγχος {{time}}',
  'statusDashboard.label.latency': '{{ms}}ms',
  'statusDashboard.label.noIncidents': 'Δεν αναφέρθηκαν συμβάντα.',
}
