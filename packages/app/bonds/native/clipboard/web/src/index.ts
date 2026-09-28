/**
 * Web bond for `@molecule/app-clipboard`.
 *
 * The browser's async Clipboard API — `navigator.clipboard` for text, and
 * `ClipboardItem` for HTML and images where the browser has it — with a
 * selection-and-copy fallback so "copy this command" works on every page.
 *
 * @example
 * ```typescript
 * import { setProvider, writeText } from '@molecule/app-clipboard'
 * import { provider } from '@molecule/app-clipboard-web'
 *
 * setProvider(provider)
 *
 * button.addEventListener('click', () => writeText('npx mlcl create my-app'))
 * ```
 *
 * @remarks
 * - **Writing text works almost everywhere; reading needs permission.**
 *   `readText`/`read` prompt the person in most browsers and reject when they
 *   decline or the page is not focused; call them from a click, never on load.
 * - **Copy from a user gesture.** Browsers allow clipboard writes only in
 *   response to a click or key press; a copy started from a timer or a fetch
 *   callback fails, and the fallback cannot help either.
 * - The fallback (`legacyCopyFallback`, on by default) covers insecure
 *   origins and a document that lost focus; it handles text only, and it
 *   moves the selection for a moment.
 * - Images are written as a `ClipboardItem`; a `data:` URL is fetched into
 *   a Blob first. Browsers without `ClipboardItem` get the text part only.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
