/**
 * Svelte fullscreen photo viewer.
 *
 * Exports `PhotoLightbox` (modal overlay with prev/next arrows, keyboard
 * navigation via ArrowLeft / ArrowRight / Escape, backdrop-click close,
 * optional captions, and an "N / total" counter) and the `LightboxPhoto`
 * type — the Svelte counterpart of `@molecule/app-photo-lightbox-react`, with
 * the same props (React names) and the same DOM for the same input.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { PhotoLightbox, type LightboxPhoto } from '@molecule/app-photo-lightbox-svelte'
 *
 *   const photos: LightboxPhoto[] = [
 *     { src: '/images/photo1.jpg', alt: 'Mountain view', caption: 'Summit at dawn' },
 *     { src: '/images/photo2.jpg', alt: 'Valley below' },
 *   ]
 *
 *   let open = $state(false)
 *   let index = $state(0)
 * </script>
 *
 * <PhotoLightbox
 *   {photos}
 *   {open}
 *   onClose={() => (open = false)}
 *   {index}
 *   onIndexChange={(next) => (index = next)}
 * />
 * ```
 *
 * @remarks
 * Companion locale bond: `@molecule/app-locales-photo-lightbox` (keys
 * `lightbox.close` / `lightbox.previous` / `lightbox.next`). The overlay is
 * `position: fixed` at `z-index: 100` with a near-black backdrop in both
 * themes; it does NOT lock body scroll while open. Requires the app-svelte i18n
 * provider and a wired ClassMap bond.
 *
 * @module
 */

export * from './components.js'
export * from './types.js'
