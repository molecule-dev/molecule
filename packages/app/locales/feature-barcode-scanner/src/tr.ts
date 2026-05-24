import type { BarcodeScannerTranslations } from './types.js'

/** FeatureBarcodeScanner translations for tr. */
export const tr: Partial<BarcodeScannerTranslations> = {
  'barcodeScanner.status.scanning': 'Taranıyor…',
  'barcodeScanner.aria.region': 'Barkod okuyucu kamera görüntüsü',
  'barcodeScanner.error.permission_denied': 'Kamera izni reddedildi.',
  'barcodeScanner.error.no_camera': 'Kamera bulunamadı.',
  'barcodeScanner.error.unsupported': 'Bu tarayıcıda kamera desteklenmiyor.',
  'barcodeScanner.error.detector_failure': 'Barkod dedektörü arızalandı.',
  'barcodeScanner.error.fallback_unavailable': 'Barkod tarayıcı kütüphanesi yüklenemedi.',
  'barcodeScanner.status.starting': 'Kamera başlatılıyor…',
  'barcodeScanner.status.stopped': 'Tarama tamamlandı',
}
