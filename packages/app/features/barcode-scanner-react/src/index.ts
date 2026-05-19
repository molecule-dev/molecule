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
 * test injection points used by `__tests__/BarcodeScanner.test.tsx`.
 *
 * @example
 * ```tsx
 * import { BarcodeScanner } from '@molecule/app-feature-barcode-scanner-react'
 *
 * <BarcodeScanner
 *   formats={['ean_13', 'upc_a']}
 *   onScan={({ format, value }) => addLineItem(value)}
 *   onError={(err) => toast.error(err.message)}
 * />
 * ```
 *
 * @remarks
 * All user-visible text routes through the companion locale bond
 * `@molecule/app-locales-feature-barcode-scanner`. Styling
 * routes through `getClassMap()` from `@molecule/app-ui` — no
 * Tailwind utility class names appear in this package.
 *
 * @module
 */

export * from './BarcodeScanner.js'
