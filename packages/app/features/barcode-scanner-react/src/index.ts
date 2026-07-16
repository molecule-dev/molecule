/**
 * Browser barcode scanner React component.
 *
 * Acquires a rear-facing camera via `getUserMedia({ video: { facingMode: 'environment' } })`
 * and decodes frames using the W3C `BarcodeDetector` API where
 * available (Chromium / WebView), falling back to `@zxing/library` for
 * Safari / Firefox. Designed for warehouse-fulfillment, inventory-
 * management, and grocery-delivery flagship apps.
 *
 * Exports `<BarcodeScanner>`, the `BarcodeFormat` / `BarcodeScanResult`
 * / `BarcodeScannerError` shapes, the `DEFAULT_FORMATS` constant, and
 * the `__setBarcodeDetectorOverride` / `__setZxingLoaderOverride`
 * test injection points.
 *
 * @example
 * ```tsx
 * import { BarcodeScanner } from '@molecule/app-feature-barcode-scanner-react'
 *
 * function ScanPanel() {
 *   return (
 *     <BarcodeScanner
 *       formats={['ean_13', 'upc_a']}
 *       onScan={({ format, value }) => addLineItem(value)}
 *       onError={(err) => showToast(err.message)}
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * Camera access requires a SECURE CONTEXT — HTTPS or `localhost` — and a
 * user permission grant. On plain http (or when the user denies), the
 * component stays on its localized error overlay and fires `onError`
 * with `'unsupported'` / `'permission_denied'`; there is nothing to
 * retry until the context or permission changes.
 *
 * The `formats` prop constrains only the native `BarcodeDetector` path.
 * The `@zxing/library` fallback (Safari / Firefox) decodes ALL
 * symbologies regardless of `formats`, and reports `format: 'unknown'`
 * in its results — filter on `result.value` shape if the symbology
 * matters cross-browser.
 *
 * Consecutive identical values are deduped: the same barcode will not
 * fire `onScan` twice in a row, even with `continuous`. Remount the
 * component (e.g. via a React `key`) to re-arm scanning for a value
 * that was already delivered.
 *
 * All user-visible text routes through the companion locale bond
 * `@molecule/app-locales-feature-barcode-scanner`. Styling
 * routes through `getClassMap()` from `@molecule/app-ui` — no
 * Tailwind utility class names appear in this package.
 *
 * @module
 */

export * from './BarcodeScanner.js'
