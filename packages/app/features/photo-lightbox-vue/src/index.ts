/**
 * Vue fullscreen photo viewer.
 *
 * Exports `<PhotoLightbox>` (modal overlay with prev/next arrows, keyboard
 * navigation via ArrowLeft / ArrowRight / Escape, backdrop-click close,
 * optional captions, and an "N / total" counter) and the `LightboxPhoto`
 * type.
 *
 * @example
 * ```ts
 * import { defineComponent, h, ref } from 'vue'
 * import { PhotoLightbox, type LightboxPhoto } from '@molecule/app-photo-lightbox-vue'
 *
 * const photos: LightboxPhoto[] = [
 *   { src: '/images/photo1.jpg', alt: 'Mountain view', caption: 'Summit at dawn' },
 *   { src: '/images/photo2.jpg', alt: 'Valley below' },
 * ]
 *
 * const Gallery = defineComponent({
 *   setup() {
 *     const open = ref(false)
 *     const index = ref(0)
 *     return () =>
 *       h(PhotoLightbox, {
 *         photos,
 *         open: open.value,
 *         onClose: () => (open.value = false),
 *         initialIndex: index.value,
 *         onIndexChange: (next: number) => (index.value = next),
 *       })
 *   },
 * })
 * ```
 *
 * @remarks
 * Companion locale bond: `@molecule/app-locales-photo-lightbox` (keys
 * `lightbox.close` / `lightbox.previous` / `lightbox.next`). The overlay is
 * `position: fixed` at `z-index: 100` with a near-black backdrop in both
 * themes; it does NOT lock body scroll while open. Requires the app-vue i18n
 * provider and a wired ClassMap bond.
 *
 * @module
 */

export * from './PhotoLightbox.js'
export * from './types.js'
