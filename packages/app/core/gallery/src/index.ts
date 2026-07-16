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
 * @module
 */

export * from './provider.js'
export * from './types.js'
