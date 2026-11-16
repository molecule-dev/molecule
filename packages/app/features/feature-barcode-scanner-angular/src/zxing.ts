/**
 * The barcode scanner's framework-free zxing helpers — identical to
 * `@molecule/app-feature-barcode-scanner-react`'s so both packages agree on
 * every derivation.
 *
 * @module
 */

import type { BarcodeFormat } from './types.js'

/** Default formats accepted when the caller doesn't pass `formats`. */
export const DEFAULT_FORMATS: BarcodeFormat[] = ['ean_13', 'upc_a', 'code_128', 'qr_code']

/**
 * Mapping from the W3C `BarcodeFormat` string values this component
 * accepts to the corresponding `@zxing/library` `BarcodeFormat` enum
 * member NAMES. Used to translate the `formats` prop into zxing's
 * `POSSIBLE_FORMATS` decode hint so the fallback reader is constrained
 * to exactly the requested symbologies.
 */
const W3C_TO_ZXING_FORMAT: Record<BarcodeFormat, string> = {
  aztec: 'AZTEC',
  codabar: 'CODABAR',
  code_39: 'CODE_39',
  code_93: 'CODE_93',
  code_128: 'CODE_128',
  data_matrix: 'DATA_MATRIX',
  ean_8: 'EAN_8',
  ean_13: 'EAN_13',
  itf: 'ITF',
  pdf417: 'PDF_417',
  qr_code: 'QR_CODE',
  upc_a: 'UPC_A',
  upc_e: 'UPC_E',
}

/**
 * Translate the requested W3C barcode `formats` into a `@zxing/library`
 * decode-hint map keyed by `DecodeHintType.POSSIBLE_FORMATS`, so the
 * fallback reader is constrained to (and optimized for) exactly those
 * symbologies instead of decoding every format it knows.
 *
 * The zxing enum objects are passed in rather than imported at module
 * scope so the heavy `@zxing/library` bundle stays lazily loaded — it is
 * only pulled in on the fallback path.
 *
 * @param formats - The requested W3C symbologies.
 * @param zxingBarcodeFormat - zxing's `BarcodeFormat` enum object.
 * @param decodeHintType - zxing's `DecodeHintType` enum object.
 * @returns A hint map for the reader, or `null` when no
 *   requested format maps to a known zxing format (caller passes no
 *   hints, leaving the reader unconstrained).
 */
export function buildZxingHints(
  formats: BarcodeFormat[],
  zxingBarcodeFormat: Record<string, number>,
  decodeHintType: Record<string, number>,
): Map<number, number[]> | null {
  const zxingFormats = formats
    .map((format) => zxingBarcodeFormat[W3C_TO_ZXING_FORMAT[format]])
    .filter((value): value is number => typeof value === 'number')
  if (zxingFormats.length === 0) return null
  return new Map<number, number[]>([[decodeHintType.POSSIBLE_FORMATS, zxingFormats]])
}
