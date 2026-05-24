import type { BarcodeScannerTranslations } from './types.js'

/** FeatureBarcodeScanner translations for id. */
export const id: Partial<BarcodeScannerTranslations> = {
  'barcodeScanner.status.scanning': 'Memindai…',
  'barcodeScanner.aria.region': 'Tampilan kamera pemindai kode batang',
  'barcodeScanner.error.permission_denied': 'Izin penggunaan kamera ditolak.',
  'barcodeScanner.error.no_camera': 'Kamera tidak ditemukan',
  'barcodeScanner.error.unsupported': 'Kamera tidak didukung di browser ini.',
  'barcodeScanner.error.detector_failure': 'Detektor kode batang gagal',
  'barcodeScanner.error.fallback_unavailable': 'Pustaka pemindai kode batang tidak dapat dimuat.',
  'barcodeScanner.status.starting': 'Menyalakan kamera…',
  'barcodeScanner.status.stopped': 'Pemindaian selesai',
}
