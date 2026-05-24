import type { BarcodeScannerTranslations } from './types.js'

/** FeatureBarcodeScanner translations for th. */
export const th: Partial<BarcodeScannerTranslations> = {
  'barcodeScanner.aria.region': 'มุมมองกล้องสแกนเนอร์บาร์โค้ด',
  'barcodeScanner.error.permission_denied': 'ไม่อนุญาตให้ใช้กล้อง',
  'barcodeScanner.error.no_camera': 'ไม่พบกล้อง',
  'barcodeScanner.error.unsupported': 'เบราว์เซอร์นี้ไม่รองรับกล้อง',
  'barcodeScanner.error.detector_failure': 'เครื่องตรวจจับบาร์โค้ดล้มเหลว',
  'barcodeScanner.error.fallback_unavailable': 'ไม่สามารถโหลดไลบรารีสแกนเนอร์บาร์โค้ดได้',
  'barcodeScanner.status.starting': 'กำลังเริ่มกล้อง…',
  'barcodeScanner.status.scanning': 'กำลังสแกน…',
  'barcodeScanner.status.stopped': 'การสแกนเสร็จสมบูรณ์',
}
