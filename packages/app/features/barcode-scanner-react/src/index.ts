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
 * / `BarcodeScannerError` shapes, the `DEFAULT_FORMATS` constant, the
 * `buildZxingHints` helper (W3C formats → zxing `POSSIBLE_FORMATS`
 * hint), and the `__setBarcodeDetectorOverride` /
 * `__setZxingLoaderOverride` test injection points.
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 *
 * import { BarcodeScanner } from '@molecule/app-feature-barcode-scanner-react'
 * import { getProvider as getI18nProvider, registerLocaleModule } from '@molecule/app-i18n'
 * import * as barcodeScannerLocales from '@molecule/app-locales-feature-barcode-scanner'
 * import { I18nProvider } from '@molecule/app-react'
 * import { setClassMap } from '@molecule/app-ui'
 * import { classMap } from '@molecule/app-ui-tailwind'
 *
 * // Startup, once.
 * setClassMap(classMap)
 * registerLocaleModule(barcodeScannerLocales)
 *
 * export function ScanPanel() {
 *   const [code, setCode] = useState<string | null>(null)
 *   const [error, setError] = useState<string | null>(null)
 *   return (
 *     <I18nProvider provider={getI18nProvider()}>
 *       <BarcodeScanner
 *         formats={['ean_13', 'upc_a']}
 *         onScan={({ value }) => setCode(value)}
 *         onError={(err) => setError(err.message)}
 *       />
 *       {code && <output>{code}</output>}
 *       {error && <p role="alert">{error}</p>}
 *     </I18nProvider>
 *   )
 * }
 * ```
 *
 * @remarks
 * It calls `useTranslation()` from `@molecule/app-react` (throws without an
 * `I18nProvider` / `MoleculeProvider i18n` above it) and `getClassMap()`
 * (throws until `setClassMap(...)` ran). The camera starts on MOUNT — render
 * it only when the user asked to scan, and unmount it to release the camera.
 * By default (`continuous={false}`) it stops the camera after the FIRST
 * successful read; remount it (e.g. change its `key`) to scan again, or pass
 * `continuous`. `scanIntervalMs` / `dedupeMs` are milliseconds.
 *
 * Camera access requires a SECURE CONTEXT — HTTPS or `localhost` — and a
 * user permission grant. On plain http (or when the user denies), the
 * component stays on its localized error overlay and fires `onError`
 * with `'unsupported'` / `'permission_denied'`; there is nothing to
 * retry until the context or permission changes.
 *
 * The `formats` prop constrains BOTH detection paths: the native
 * `BarcodeDetector` gets them directly, and the `@zxing/library`
 * fallback (Safari / Firefox) maps them onto zxing's
 * `POSSIBLE_FORMATS` decode hint so it too scans only the requested
 * symbologies. The fallback still reports `format: 'unknown'` in its
 * results — filter on `result.value` shape if the symbology matters
 * cross-browser.
 *
 * Identical values are deduped for a cooldown window (`dedupeMs`,
 * default 1.5s), not forever: in `continuous` mode the SAME code can be
 * re-scanned and re-emitted once the window elapses (e.g. adding two of
 * the same item on purpose), and a DIFFERENT code always emits
 * immediately. Set `dedupeMs` to tune the window.
 *
 * All user-visible text routes through the companion locale bond
 * `@molecule/app-locales-feature-barcode-scanner`. Styling
 * routes through `getClassMap()` from `@molecule/app-ui` — no
 * Tailwind utility class names appear in this package.
 *
 * @module
 */

export * from './BarcodeScanner.js'
