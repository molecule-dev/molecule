/**
 * React Native clipboard provider for molecule.dev.
 *
 * Uses `@react-native-clipboard/clipboard` to implement the ClipboardProvider interface
 * from `@molecule/app-clipboard`.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/app-clipboard'
 * import { provider } from '@molecule/app-clipboard-react-native'
 *
 * setProvider(provider)
 * ```
 *
 * @remarks
 * Platform limits of the underlying `@react-native-clipboard/clipboard`
 * (installed separately; the first clipboard call throws an actionable
 * error naming it if missing):
 * - HTML is NOT supported: `writeHtml()`/`write({ html })` write the markup
 *   as PLAIN TEXT, and `readHtml()` always resolves `null`.
 * - Images: `writeImage()`/`readImage()` work only where the native module
 *   supports them (iOS) and only with base64 strings — elsewhere (Android,
 *   Blob input) they silently no-op / return null. Check
 *   `getCapabilities().canWriteImage` before showing a copy-image action.
 * - `onChange()` fires only with `createReactNativeClipboardProvider({
 *   pollForChanges: true })` — the bare `provider` export has it OFF and
 *   returns a no-op unsubscribe.
 *
 * @module @molecule/app-clipboard-react-native
 */

export * from './provider.js'
export * from './types.js'
