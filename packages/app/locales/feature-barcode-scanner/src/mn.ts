import type { BarcodeScannerTranslations } from './types.js'

/** FeatureBarcodeScanner translations for mn. */
export const mn: Partial<BarcodeScannerTranslations> = {
  'barcodeScanner.aria.region': 'Бар код сканнерын камерын харагдац',
  'barcodeScanner.error.permission_denied': 'Камерын зөвшөөрөл олгохоос татгалзсан',
  'barcodeScanner.error.no_camera': 'Камер олдсонгүй',
  'barcodeScanner.error.unsupported': 'Энэ хөтөч дээр камер дэмжигдээгүй байна',
  'barcodeScanner.error.detector_failure': 'Бар код илрүүлэгч амжилтгүй болсон',
  'barcodeScanner.error.fallback_unavailable': 'Бар код сканнерын санг ачаалж чадсангүй',
  'barcodeScanner.status.starting': 'Камерыг эхлүүлж байна…',
  'barcodeScanner.status.scanning': 'Скан хийж байна…',
  'barcodeScanner.status.stopped': 'Скан хийж дууслаа',
}
