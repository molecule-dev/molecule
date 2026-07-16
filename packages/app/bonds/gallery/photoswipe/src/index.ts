/**
 * Gallery provider for `@molecule/app-gallery` — headless, in-memory
 * navigation state (current index, open/close/next/previous/goTo). Despite
 * the name, this bond does NOT bundle or call the PhotoSwipe library (no
 * dependency) and renders no lightbox UI of its own.
 *
 * @example
 * ```typescript
 * import { provider } from '@molecule/app-gallery-photoswipe'
 * import { setProvider } from '@molecule/app-gallery'
 *
 * setProvider(provider)   // once, at app startup (bonds.ts)
 * ```
 *
 * @remarks
 * - **State-only: `open()` displays nothing.** Your app renders the lightbox
 *   overlay (image, prev/next, close, counter) with `getClassMap()`/`cm.*` and
 *   `t('key', values, { defaultValue })` labels, and re-reads
 *   `getCurrentIndex()` after each navigation call (there are no change events).
 * - **Configuration is currently inert** — `createProvider()` ignores
 *   `PhotoSwipeConfig` (`zoomable`, `showCounter`), and of `GalleryOptions`
 *   only `items`, `startIndex`, and `onClose` are honored (`zoomable`,
 *   `showCounter`, `showThumbnails` do nothing). Don't gate UI behavior on them.
 * - **Wire with `setProvider()` from `@molecule/app-gallery`** — the core keeps
 *   a module-local singleton; a generic `bond('gallery', …)` silently no-ops
 *   and `requireProvider()` throws.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
