import type { FeatureBarcodeScannerTranslations } from './types.js'

/** FeatureBarcodeScanner translations for ar. */
export const ar: Partial<FeatureBarcodeScannerTranslations> = {
  'barcodeScanner.status.scanning': 'جارٍ الفحص…',
  'barcodeScanner.aria.region': 'عرض كاميرا ماسح الباركود',
  'barcodeScanner.error.permission_denied': 'تم رفض إذن استخدام الكاميرا',
  'barcodeScanner.error.no_camera': 'لم يتم العثور على كاميرا',
  'barcodeScanner.error.unsupported': 'الكاميرا غير مدعومة في هذا المتصفح',
  'barcodeScanner.error.detector_failure': 'فشل جهاز كشف الباركود',
  'barcodeScanner.error.fallback_unavailable': 'تعذر تحميل مكتبة ماسح الباركود',
  'barcodeScanner.status.starting': 'بدء تشغيل الكاميرا…',
  'barcodeScanner.status.stopped': 'اكتمل المسح',
}
