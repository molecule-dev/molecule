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
 * import { setProvider, requireProvider } from '@molecule/app-gallery'
 * import { provider } from '@molecule/app-gallery-photoswipe'
 *
 * setProvider(provider)                    // once, at app startup (bonds.ts)
 *
 * const gallery = requireProvider().createGallery({
 *   items: [{ src: '/photos/1.jpg', width: 1200, height: 800, alt: 'Sunset' }],
 *   zoomable: true,
 * })
 * gallery.open(0)   // then render your overlay from getCurrentIndex()
 * ```
 *
 * @remarks
 * - **The instance is headless — `open()` displays nothing by itself.** Your app
 *   renders the lightbox overlay (image, prev/next, close, counter) with
 *   `getClassMap()`/`cm.*` and `t('key', values, { defaultValue })` for labels, and
 *   drives it via `open/close/next/previous/goTo`, re-reading `getCurrentIndex()`
 *   after each call (there is no change-subscription API).
 * - **Wire with `setProvider()` from THIS package, not `bond('gallery', …)`** — the
 *   singleton is module-local; `requireProvider()` throws otherwise.
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
