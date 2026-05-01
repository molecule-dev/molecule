import qrcode from 'qrcode-generator'

import type { QrErrorCorrectionLevel } from './types.js'

/**
 * Built QR-code matrix paired with its module count and chosen margin.
 *
 * The matrix is a 2D `boolean[][]` where `true` is a "dark" module. Callers
 * should add `margin` modules of quiet zone on every side when rendering.
 */
export interface QrMatrix {
  /** Edge length of the QR matrix, in modules (excludes the margin). */
  moduleCount: number
  /** Quiet-zone margin in modules (same on every side). */
  margin: number
  /** `true` when the module at `[row][col]` is dark. */
  isDark: (row: number, col: number) => boolean
}

/**
 * Build a QR-code matrix for the given value at the requested error-correction
 * level. Uses `qrcode-generator` with `typeNumber=0` so the smallest type that
 * fits is auto-selected.
 *
 * @param value - String to encode (URL, ticket id, redemption code, etc.).
 * @param errorCorrection - Error-correction level. Defaults to `'M'`.
 * @param margin - Quiet-zone margin in modules. Defaults to 2.
 * @returns Matrix descriptor — module count + dark-module accessor.
 */
export function buildMatrix(
  value: string,
  errorCorrection: QrErrorCorrectionLevel = 'M',
  margin = 2,
): QrMatrix {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error('value must be a non-empty string')
  }
  if (margin < 0 || !Number.isFinite(margin)) {
    throw new Error('margin must be a non-negative finite number')
  }
  // typeNumber=0 lets the library pick the smallest type that fits.
  const qr = qrcode(0, errorCorrection)
  qr.addData(value)
  qr.make()

  const moduleCount = qr.getModuleCount()
  return {
    moduleCount,
    margin,
    isDark: (row: number, col: number) => qr.isDark(row, col),
  }
}
