/**
 * Clipboard access interface for molecule.dev.
 *
 * Provides a unified API for clipboard operations across platforms: plain
 * text, HTML, images, and arbitrary data (`write*`/`read*`/`clear`/
 * `getAvailableTypes`), plus `copyTextWithFallback()` — the safe
 * copy-a-string path that works even with no provider registered.
 *
 * @example
 * ```ts
 * import { copyTextWithFallback, setProvider, readText } from '@molecule/app-clipboard'
 *
 * // Copy-to-clipboard button (web-safe, no wiring needed):
 * const copied = await copyTextWithFallback('https://example.com/invite/abc')
 * if (!copied) {
 *   // show the text for manual copying — clipboard access was blocked
 * }
 *
 * // React Native: wire the prebuilt bond once at startup, then the full API works.
 * // import { provider as clipboardProvider } from '@molecule/app-clipboard-react-native'
 * // setProvider(clipboardProvider)
 * // const text = await readText()
 * ```
 *
 * @remarks
 * - **Provider reality:** the only prebuilt bond is `@molecule/app-clipboard-react-native`
 *   (React Native). There is NO web or Capacitor bond — ignore any runtime error text
 *   suggesting a `-capacitor` package. On web, either use `copyTextWithFallback()` (copy-only)
 *   or implement `ClipboardProvider` over `navigator.clipboard` and `setProvider()` it.
 * - Every `write*`/`read*` function throws until a provider is set;
 *   `copyTextWithFallback()` is the ONE no-provider-safe call (falls back to the deprecated
 *   `document.execCommand('copy')` and returns `false` instead of throwing).
 * - Web clipboard READING needs a secure context, a user gesture, and a granted permission —
 *   expect `read()`/`readText()` to fail outside a click handler; `isTextInClipboard()`
 *   returns `false` on any failure by contract.
 * - `onChange` is optional per provider — when unsupported it warns and returns a no-op
 *   unsubscribe rather than firing.
 *
 * @module
 */

export * from './clipboard.js'
export * from './provider.js'
export * from './types.js'
export * from './utilities.js'
