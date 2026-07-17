/**
 * PhotoSwipe v5 gallery provider for `@molecule/app-gallery`.
 *
 * Drives the real PhotoSwipe lightbox: `open()` constructs a `PhotoSwipe`
 * instance from the core `GalleryItem[]` (mapped to PhotoSwipe slides) and calls
 * `.init()` to actually display it; `close()` and navigation delegate to the
 * live instance. This is a real, rendering provider — not headless state.
 *
 * @example
 * ```typescript
 * // REQUIRED — also `import 'photoswipe/style.css'` in your app entry (see @remarks)
 * import { provider } from '@molecule/app-gallery-photoswipe'
 * import { setProvider, requireProvider } from '@molecule/app-gallery'
 *
 * setProvider(provider)                // once, at app startup (bonds.ts)
 *
 * const gallery = requireProvider().createGallery({
 *   items: [{ src: '/photos/1.jpg', width: 1200, height: 800, alt: 'Sunset' }],
 *   zoomable: true,
 * })
 * gallery.open(0)                      // opens the PhotoSwipe lightbox at item 0
 * ```
 *
 * @remarks
 * - **Import PhotoSwipe's stylesheet yourself** — this package does not:
 *   `import 'photoswipe/style.css'` (aka `photoswipe/dist/photoswipe.css`).
 *   Without it the lightbox opens unstyled/invisible.
 * - **Browser-only.** `open()` runs `new PhotoSwipe(...).init()`, which needs a
 *   live DOM — construct/open galleries in a client-only effect, never during SSR.
 * - **`open()` renders the real lightbox** (unlike a headless provider). Each
 *   `GalleryItem` maps to a PhotoSwipe slide — `src`, `width`, `height`, `alt`;
 *   `thumbnail` → `msrc` (low-res placeholder); `caption` carried through — opened
 *   at `startIndex`/the given index. `getCurrentIndex()` follows PhotoSwipe's own
 *   navigation (arrows/swipe/keyboard) via its `change` event.
 * - **`GalleryOptions` drive PhotoSwipe:** `onClose` fires on the lightbox `close`
 *   event; `zoomable` → PhotoSwipe's `zoom` button, `showCounter` → its `counter`
 *   (per-gallery options override the provider-level `PhotoSwipeConfig`; both
 *   default on). `showThumbnails` has no effect — PhotoSwipe core has no thumbnail
 *   strip (it needs a separate plugin).
 * - **Wire with `setProvider()` from `@molecule/app-gallery`** — the core keeps a
 *   module-local singleton; a generic `bond('gallery', …)` silently no-ops and
 *   `requireProvider()` throws.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
