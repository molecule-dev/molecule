/**
 * Browser barcode scanner Svelte component.
 *
 * Acquires a rear-facing camera via `getUserMedia({ video: { facingMode: 'environment' } })`
 * and decodes frames using the W3C `BarcodeDetector` API where
 * available (Chromium / WebView), falling back to `@zxing/library` for
 * Safari / Firefox. Designed for warehouse-fulfillment, inventory-
 * management, and grocery-delivery flagship apps.
 *
 * It is the Svelte counterpart of
 * `@molecule/app-feature-barcode-scanner-react`: the same exports, the same
 * props (React names) and the same DOM for the same input, so an app switches
 * framework by changing only the package name in its imports.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { BarcodeScanner } from '@molecule/app-feature-barcode-scanner-svelte'
 *
 *   let lastCode = $state('')
 * </script>
 *
 * <BarcodeScanner
 *   formats={['ean_13', 'upc_a']}
 *   onScan={(result) => (lastCode = result.value)}
 *   onError={(err) => showToast(err.message)}
 * />
 * ```
 *
 * @remarks
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
 * Tests and constrained environments inject the platform APIs as props
 * instead of monkey-patching globals: `barcodeDetector` swaps (or with
 * `null` removes) the native `BarcodeDetector` constructor, and
 * `loadZxing` swaps (or with `null` fails) the `@zxing/library` loader.
 *
 * All user-visible text routes through the companion locale bond
 * `@molecule/app-locales-feature-barcode-scanner`. Styling
 * routes through `getClassMap()` from `@molecule/app-ui` — no
 * Tailwind utility class names appear in this package.
 *
 * @module
 */

export * from './components.js'
export * from './types.js'
export * from './zxing.js'
