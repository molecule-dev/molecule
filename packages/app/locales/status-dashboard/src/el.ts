import type { StatusDashboardTranslations } from './types.js'

/** StatusDashboard translations for el. */
export const el: Partial<StatusDashboardTranslations> = {
  'statusDashboard.label.degraded': 'Υποβαθμισμένο',
  'statusDashboard.label.down': 'Μη διαθέσιμο',
  'statusDashboard.label.services': 'Υπηρεσίες',
  'statusDashboard.label.uptime': 'Λειτουργία',
  'statusDashboard.error.fetchFailed': 'Αποτυχία ανάκτησης κατάστασης: HTTP {{status}}',
  'statusDashboard.label.allOperational': 'Όλα τα συστήματα λειτουργούν',
  'statusDashboard.label.someIssues': 'Ορισμένα συστήματα αντιμετωπίζουν προβλήματα',
  'statusDashboard.label.majorOutage': 'Σημαντική διακοπή συστήματος',
  'statusDashboard.label.operational': 'Επιχειρήσεων',
  'statusDashboard.label.unknown': 'Αγνωστος',
  'statusDashboard.label.incidents': 'Περιστατικά',
  'statusDashboard.label.lastChecked': 'Τελευταίος έλεγχος {{time}}',
  'statusDashboard.label.latency': '{{ms}} ms',
  'statusDashboard.label.noIncidents': 'Δεν αναφέρθηκαν περιστατικά.',
  'statusDashboard.error.noProvider':
    'Δεν έχει ρυθμιστεί ο πάροχος του πίνακα ελέγχου κατάστασης. Συνδέστε πρώτα έναν πάροχο του πίνακα ελέγχου κατάστασης.',
}
