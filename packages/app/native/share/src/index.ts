/**
 * Native share-sheet interface for molecule.dev.
 *
 * Framework-agnostic core for handing content to the platform share sheet
 * through a swappable `ShareProvider`: `share` (title/text/url),
 * `shareText`, `shareUrl`, `shareFiles`, feature detection (`canShare`,
 * `canShareContent`, `getCapabilities`) — plus provider-free `socialUrls`
 * builders (web intent links for X/Facebook/LinkedIn/WhatsApp/etc.) that
 * work in ANY browser as a fallback.
 *
 * @example
 * ```typescript
 * import {
 *   canShare,
 *   hasProvider,
 *   shareUrl,
 *   socialUrls,
 * } from '@molecule/app-share'
 *
 * async function shareArticle(url: string, title: string): Promise<void> {
 *   if (hasProvider() && (await canShare())) {
 *     const result = await shareUrl(url, title)
 *     if (result.completed) return
 *   }
 *   // Fallback that needs no provider: open a share-intent URL
 *   window.open(socialUrls.twitter(title, url), '_blank')
 * }
 * ```
 *
 * @remarks
 * - **Every share call THROWS until `setProvider()` is called** — **no
 *   prebuilt provider package ships with molecule**. On web, wire a thin
 *   `ShareProvider` over `navigator.share`/`navigator.canShare`; on native,
 *   implement against your container's share module. Gate UI on
 *   `hasProvider()` + `canShare()` and keep the `socialUrls` fallback for
 *   everything else.
 * - The Web Share API needs HTTPS AND a user gesture (call `share` directly
 *   in the click handler — an `await` before it can void the gesture in
 *   Safari), and is missing from most DESKTOP browsers (Firefox/Chrome-
 *   Linux) — desktop fallback is not optional.
 * - `shareFiles` support is much narrower than text/url support — check
 *   `canShareContent({ files })` (per-content probe) before offering it.
 * - A dismissed sheet is NOT an error: expect `result.completed === false`
 *   with no `error` and stay quiet about it.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
export * from './utilities.js'
