import type { StatusTranslations } from './types.js'

/** Status translations for Greek. */
export const el: StatusTranslations = {
  'status.error.serviceNotFound': 'Η υπηρεσία δεν βρέθηκε.',
  'status.error.incidentNotFound': 'Το περιστατικό δεν βρέθηκε.',
  'status.error.validationFailed': 'Η επικύρωση απέτυχε: {{errors}}',
  'status.error.createServiceFailed': 'Αποτυχία δημιουργίας υπηρεσίας.',
  'status.error.updateServiceFailed': 'Αποτυχία ενημέρωσης υπηρεσίας.',
  'status.error.deleteServiceFailed': 'Αποτυχία διαγραφής υπηρεσίας.',
  'status.error.getServiceFailed': 'Αποτυχία ανάκτησης υπηρεσίας.',
  'status.error.listServicesFailed': 'Αποτυχία εμφάνισης υπηρεσιών.',
  'status.error.createIncidentFailed': 'Αποτυχία δημιουργίας περιστατικού.',
  'status.error.updateIncidentFailed': 'Αποτυχία ενημέρωσης περιστατικού.',
  'status.error.listIncidentsFailed': 'Αποτυχία εμφάνισης περιστατικών.',
  'status.error.getStatusFailed': 'Αποτυχία ανάκτησης κατάστασης συστήματος.',
  'status.error.getUptimeFailed': 'Αποτυχία ανάκτησης δεδομένων διαθεσιμότητας.',
}
