/**
 * Solid fullscreen photo viewer.
 *
 * Exports `<PhotoLightbox>` (modal overlay with prev/next arrows, keyboard
 * navigation via ArrowLeft / ArrowRight / Escape, backdrop-click close,
 * optional captions, and an "N / total" counter) and the `LightboxPhoto`
 * type.
 *
 * @example
 * ```tsx
 * import { createSignal } from 'solid-js'
 * import { PhotoLightbox, type LightboxPhoto } from '@molecule/app-photo-lightbox-solid'
 *
 * const photos: LightboxPhoto[] = [
 *   { src: '/images/photo1.jpg', alt: 'Mountain view', caption: 'Summit at dawn' },
 *   { src: '/images/photo2.jpg', alt: 'Valley below' },
 * ]
 *
 * export function Gallery() {
 *   const [open, setOpen] = createSignal(false)
 *   const [index, setIndex] = createSignal(0)
 *   return (
 *     <PhotoLightbox
 *       photos={photos}
 *       open={open()}
 *       onClose={() => setOpen(false)}
 *       initialIndex={index()}
 *       onIndexChange={setIndex}
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * Companion locale bond: `@molecule/app-locales-photo-lightbox` (keys
 * `lightbox.close` / `lightbox.previous` / `lightbox.next`). The overlay is
 * `position: fixed` at `z-index: 100` with a near-black backdrop in both
 * themes; it does NOT lock body scroll while open. Requires the app-solid i18n
 * provider and a wired ClassMap bond.
 *
 * @module
 */

export * from './PhotoLightbox.jsx'
export * from './types.js'
