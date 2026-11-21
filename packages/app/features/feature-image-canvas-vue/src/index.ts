/**
 * Vue Canvas2D image-editing surface.
 *
 * Exports `ImageCanvas` — the Vue counterpart of
 * `@molecule/app-feature-image-canvas-react` with the same props and the same
 * DOM: an image rendered onto a canvas with a filter chain (brightness,
 * contrast, saturation, hue, sepia, grayscale, blur, sharpen), pointer-drag
 * panning, wheel zooming, and a `toDataURL()` export handle, plus the
 * framework-free `clamp`, `composeFilterString`, `screenToCanvas` and
 * `clampPan` helpers.
 *
 * @example
 * ```ts
 * import { defineComponent, h, ref } from 'vue'
 * import {
 *   ImageCanvas,
 *   type ImageCanvasExportHandle,
 * } from '@molecule/app-feature-image-canvas-vue'
 *
 * const Editor = defineComponent({
 *   setup() {
 *     const exportRef = ref<{ current: ImageCanvasExportHandle | null }>({ current: null })
 *     const zoom = ref(1)
 *     const pan = ref({ x: 0, y: 0 })
 *     return () =>
 *       h(ImageCanvas, {
 *         src: '/photo.jpg',
 *         filters: { brightness: 1.1, contrast: 1.2, sepia: 0.3 },
 *         zoom: zoom.value,
 *         pan: pan.value,
 *         onChange: (next) => {
 *           zoom.value = next.zoom
 *           pan.value = next.pan
 *         },
 *         exportRef: exportRef.value,
 *       })
 *   },
 * })
 * ```
 *
 * @remarks
 * - Pan / zoom interaction is CONTROLLED-ONLY: pointer-drag and wheel events
 *   call `onChange` with the proposed `{ zoom, pan }` and never mutate
 *   internal state. Without `onChange` and a caller feeding the values back
 *   through the `zoom` / `pan` props, dragging and scrolling do nothing.
 * - Requires a bonded ClassMap (the frame and the loading text use ClassMap
 *   tokens) and a bonded i18n provider for its aria labels and messages.
 * - URL sources load with `crossOrigin="anonymous"` so `toDataURL()` is never
 *   blocked by a tainted canvas — remote images MUST be served with CORS
 *   headers. Same-origin and data-URL sources are unaffected.
 * - The canvas bitmap is exactly `width` x `height` device-independent
 *   pixels — there is no devicePixelRatio upscaling.
 *
 * @module
 */

export * from './helpers.js'
export * from './ImageCanvas.js'
export * from './types.js'
