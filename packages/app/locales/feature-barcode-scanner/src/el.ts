import type { FeatureBarcodeScannerTranslations } from './types.js'

/** FeatureBarcodeScanner translations for el. */
export const el: Partial<FeatureBarcodeScannerTranslations> = {
  'barcodeScanner.aria.region': 'Προβολή κάμερας σαρωτή γραμμωτού κώδικα',
  'barcodeScanner.error.permission_denied': 'Η άδεια χρήσης κάμερας απορρίφθηκε',
  'barcodeScanner.error.no_camera': 'Δεν βρέθηκε κάμερα',
  'barcodeScanner.error.unsupported': 'Η κάμερα δεν υποστηρίζεται σε αυτό το πρόγραμμα περιήγησης.',
  'barcodeScanner.error.detector_failure': 'Ο ανιχνευτής γραμμωτού κώδικα απέτυχε.',
  'barcodeScanner.error.fallback_unavailable':
    'Δεν ήταν δυνατή η φόρτωση της βιβλιοθήκης σαρωτή γραμμωτού κώδικα',
  'barcodeScanner.status.starting': 'Έναρξη κάμερας…',
  'barcodeScanner.status.scanning': 'Ερευνα…',
  'barcodeScanner.status.stopped': 'Η σάρωση ολοκληρώθηκε',
}
