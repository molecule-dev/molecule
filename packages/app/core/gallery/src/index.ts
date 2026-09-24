/**
 * Gallery core interface for molecule.dev.
 *
 * Framework-agnostic contract for image gallery / lightbox **state**
 * (item list, current index, open/closed). Bond a provider (e.g.
 * `@molecule/app-gallery-photoswipe`) to supply the navigation logic; your
 * UI renders the lightbox and calls the instance to navigate.
 *
 * @example
 * ```typescript
 * import { requireProvider, setProvider } from '@molecule/app-gallery'
 * import { provider } from '@molecule/app-gallery-photoswipe'
 * // + `import 'photoswipe/style.css'` once in your app entry — without it the lightbox is invisible
 *
 * setProvider(provider) // once, at app startup (bonds.ts)
 *
 * const photos = [
 *   {
 *     src: '/photos/sunset.jpg',
 *     thumbnail: '/photos/sunset-thumb.jpg', // low-res placeholder while the full image loads
 *     width: 1200,
 *     height: 800,
 *     alt: 'Sunset over the bay',
 *   },
 *   { src: '/photos/harbor.jpg', width: 1200, height: 900, alt: 'Harbor at dawn' },
 * ]
 * const gallery = requireProvider().createGallery({
 *   items: photos,
 *   onClose: () => console.log('lightbox closed'),
 * })
 *
 * // In a thumbnail's click handler (browser only — PhotoSwipe needs a live DOM):
 * gallery.open(1) // opens the PhotoSwipe lightbox on 'Harbor at dawn'
 * console.log(gallery.getCurrentIndex()) // 1 — follows the user's swipes/arrow keys
 * gallery.close() // fires onClose
 * ```
 *
 * @remarks
 * - **What `open()` shows depends on the bond.** `@molecule/app-gallery-photoswipe`
 *   renders the real PhotoSwipe lightbox (and needs `import 'photoswipe/style.css'`);
 *   do NOT build a second overlay on top of it. Your UI renders the thumbnail grid
 *   (`getClassMap()`/`cm.*`, labels via `t('key', values, { defaultValue })`) and calls
 *   `open(index)` on click. There is no change-subscription API — re-read
 *   `getCurrentIndex()` when you need the position.
 * - **Browser-only:** open galleries from a click handler / client-only effect, never
 *   during SSR.
 * - **Wire with THIS package's `setProvider()` or `bond('gallery', …)`** —
 *   `setProvider()` delegates into the shared `@molecule/app-bond` registry, so both
 *   write the same slot; `requireProvider()` throws until one has run
 *   (`getProvider()` returns `null` instead).
 * - Provide real `width`/`height` per item (they drive layout/zoom math) and an
 *   `alt` for accessibility — empty alt text fails the a11y bar.
 *
 * @e2e
 * Integration checklist - drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual gallery screen, and check every box off one
 * by one. A box you can't check is an integration bug to fix - not a skip:
 * - [ ] The gallery grid/layout renders every item, and each image actually
 *   loads - a real rendered <img> with natural dimensions > 0, not a
 *   broken-image icon or empty box. Thumbnails (when an item sets one) load
 *   in the grid instead of the full-res src.
 * - [ ] Clicking a grid image opens the lightbox showing THAT image:
 *   getCurrentIndex() equals the clicked index and the overlay displays the
 *   matching full-res src (the headless instance renders nothing on its own -
 *   your overlay must actually appear on open()).
 * - [ ] next()/previous() step through the items in order - getCurrentIndex()
 *   moves by one and the displayed image changes to match; at the first/last
 *   item they wrap or stop exactly as the UI is designed to, never going blank.
 * - [ ] goTo(i) and the thumbnail strip (when showThumbnails) jump straight to
 *   item i; the counter (when showCounter, the default) reads the correct
 *   "current / total".
 * - [ ] alt text and captions render when the item provides them; zoom
 *   (when zoomable, the default) actually magnifies the open image.
 * - [ ] If the grid lazy-loads, offscreen images are NOT all fetched up front -
 *   they load as they scroll into view; each one loads (no broken image).
 * - [ ] Closing the lightbox (close(), the close control, or Escape when
 *   supported) fires onClose and returns to the grid with no overlay left
 *   covering the page.
 * - [ ] Keyboard navigation works wherever the UI supports it - arrow keys
 *   move prev/next and Escape closes, matching the pointer behaviour above.
 * - [ ] Every image loads from the app's own origin (uploaded or bundled
 *   assets), not a broken external hotlink - no image request 404s or is
 *   blocked by egress.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
