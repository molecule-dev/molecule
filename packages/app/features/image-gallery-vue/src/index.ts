/**
 * Vue image gallery.
 *
 * Exports `<ImageGallery>` — main image + thumbnail grid with controlled-optional
 * selection and "+N" overflow summarisation. It is the Vue counterpart of
 * `@molecule/app-image-gallery-react`: same props and the same DOM for the same
 * input.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h, ref } from 'vue'
 * import { ImageGallery } from '@molecule/app-image-gallery-vue'
 *
 * const images = [
 *   'https://example.com/photo-1.jpg',
 *   'https://example.com/photo-2.jpg',
 *   'https://example.com/photo-3.jpg',
 * ]
 *
 * const Gallery = defineComponent({
 *   setup() {
 *     const active = ref(0)
 *     // Uncontrolled — manages its own selected index;
 *     // pass `selectedIndex: active.value` and `onSelect: (i) => (active.value = i)`
 *     // to drive it from the caller instead.
 *     return () => h(ImageGallery, { images, maxThumbnails: 4 })
 *   },
 * })
 *
 * createApp(Gallery).mount('#app')
 * ```
 *
 * @remarks
 * - Renders nothing when `images` is empty — no empty-state UI.
 * - `maxThumbnails` doubles as the thumbnail grid's column count. Any value is
 *   safe: it is snapped to the nearest column count the ClassMap grid actually
 *   supports (1-6 or 12), so a real `grid-cols-*` class is always emitted and
 *   extra thumbnails wrap onto additional rows instead of collapsing.
 * - Default alt text is the English "Image N" — pass `alts` with translated
 *   strings in localized apps.
 * - `getClassMap()` requires a bonded ClassMap (e.g.
 *   `@molecule/app-ui-tailwind`).
 *
 * @module
 */

export * from './ImageGallery.js'
export * from './types.js'
