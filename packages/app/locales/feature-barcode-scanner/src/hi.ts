import type { BarcodeScannerTranslations } from './types.js'

/** FeatureBarcodeScanner translations for hi. */
export const hi: Partial<BarcodeScannerTranslations> = {
  'barcodeScanner.status.scanning': 'स्कैन हो रहा है…',
  'barcodeScanner.aria.region': 'बारकोड स्कैनर कैमरा दृश्य',
  'barcodeScanner.error.permission_denied': 'कैमरा अनुमति अस्वीकृत',
  'barcodeScanner.error.no_camera': 'कोई कैमरा नहीं मिला',
  'barcodeScanner.error.unsupported': 'इस ब्राउज़र में कैमरा समर्थित नहीं है',
  'barcodeScanner.error.detector_failure': 'बारकोड डिटेक्टर विफल हो गया',
  'barcodeScanner.error.fallback_unavailable': 'बारकोड स्कैनर लाइब्रेरी लोड नहीं हो सकी',
  'barcodeScanner.status.starting': 'कैमरा चालू करें…',
  'barcodeScanner.status.stopped': 'स्कैन पूरा हुआ',
}
