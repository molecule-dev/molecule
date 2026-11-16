/**
 * The barcode scanner's framework-free platform helpers — identical to
 * `@molecule/app-feature-barcode-scanner-react`'s so both packages agree on
 * every dispatch.
 *
 * @module
 */

import type {
  BarcodeDetectorConstructor,
  BarcodeFormat,
  BarcodeScannerErrorCode,
  ZxingLoader,
} from './types.js'
import { buildZxingHints } from './zxing.js'

/**
 * Resolve the active `BarcodeDetector` constructor: the injected
 * `barcodeDetector` prop takes precedence, then the browser's
 * `globalThis.BarcodeDetector` (the W3C Shape Detection API, present
 * only in Chromium / WebView). Returns `null` when neither is
 * available — the caller runs the `@zxing/library` fallback.
 *
 * @param injected - The `barcodeDetector` prop: a constructor, `null`
 *   to force the fallback, or `undefined` for the browser default.
 * @returns The detector constructor or `null`.
 */
export function resolveDetectorCtor(
  injected: BarcodeDetectorConstructor | null | undefined,
): BarcodeDetectorConstructor | null {
  if (injected === null) return null
  if (injected !== undefined) return injected
  // The platform API is read through the `'BarcodeDetector' in host`
  // narrowing, and the value itself is duck-typed before the single,
  // guarded cast — never a chained type assertion.
  const host = globalThis
  if (!('BarcodeDetector' in host)) return null
  const ctor: unknown = host.BarcodeDetector
  return typeof ctor === 'function' ? (ctor as BarcodeDetectorConstructor) : null
}

/**
 * Resolve the active fallback loader: the injected `loadZxing` prop
 * takes precedence; otherwise callers get a real dynamic import of
 * `@zxing/library`'s `BrowserMultiFormatReader`, constructed with a
 * `POSSIBLE_FORMATS` hint derived from the requested `formats`.
 *
 * @param injected - The `loadZxing` prop: a loader, `null` to make the
 *   fallback fail (as offline), or `undefined` for the real dynamic
 *   import.
 * @returns A loader function or `null` when forced unavailable.
 */
export function resolveZxingLoader(injected: ZxingLoader | null | undefined): ZxingLoader | null {
  if (injected === null) return null
  if (injected !== undefined) return injected
  return async (formats: BarcodeFormat[]) => {
    const mod = await import('@zxing/library')
    const hints = buildZxingHints(
      formats,
      numericEnumTable(mod.BarcodeFormat),
      numericEnumTable(mod.DecodeHintType),
    )
    const reader = new mod.BrowserMultiFormatReader(hints ?? undefined)
    return {
      async decodeOnceFromVideoElement(video: HTMLVideoElement) {
        const r = await reader.decodeFromVideoElement(video)
        return { text: r.getText() }
      },
      reset() {
        reader.reset()
      },
    }
  }
}

/**
 * The numeric name → value table of a zxing enum object. zxing's enums are
 * real TypeScript numeric enums, so their runtime objects also carry the
 * reverse mapping — every value keyed back to its name as a string — and
 * that string-valued reverse index is why the enum object itself cannot flow
 * into {@link buildZxingHints}'s `Record<string, number>` parameters.
 * Copying only the numeric-valued keys yields exactly the plain table the
 * helper indexes, with the plain shape its signature declares.
 *
 * @param source - The zxing enum object.
 * @returns The numeric name → value table.
 */
function numericEnumTable(source: Record<string, number | string>): Record<string, number> {
  const table: Record<string, number> = {}
  for (const [name, value] of Object.entries(source)) {
    if (typeof value === 'number') table[name] = value
  }
  return table
}

/**
 * Map a `getUserMedia` rejection into a stable `BarcodeScannerError`
 * code so callers can branch on a small finite set of strings.
 *
 * @param error - The original rejection.
 * @returns The mapped error code.
 */
export function mapMediaErrorCode(error: unknown): BarcodeScannerErrorCode {
  // `DOMException` in some environments (older jsdom, certain
  // browser sandboxes) does not extend `Error`, so duck-type the
  // `name` field directly.
  const name =
    error !== null && typeof error === 'object' && 'name' in error
      ? String((error as { name: unknown }).name)
      : ''
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'permission_denied'
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'no_camera'
  return 'detector_failure'
}
