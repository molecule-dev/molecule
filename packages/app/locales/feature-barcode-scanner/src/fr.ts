import type { BarcodeScannerTranslations } from './types.js'

/** FeatureBarcodeScanner translations for fr. */
export const fr: Partial<BarcodeScannerTranslations> = {
  'barcodeScanner.status.scanning': 'Analyse en cours…',
  'barcodeScanner.aria.region': 'vue de la caméra du lecteur de codes-barres',
  'barcodeScanner.error.permission_denied': 'Autorisation de prise de vue refusée',
  'barcodeScanner.error.no_camera': 'Aucune caméra trouvée',
  'barcodeScanner.error.unsupported': 'Caméra non prise en charge par ce navigateur',
  'barcodeScanner.error.detector_failure': 'Le détecteur de codes-barres a échoué',
  'barcodeScanner.error.fallback_unavailable':
    'Impossible de charger la bibliothèque du lecteur de codes-barres',
  'barcodeScanner.status.starting': 'Démarrage de la caméra…',
  'barcodeScanner.status.stopped': 'Numérisation terminée',
}
