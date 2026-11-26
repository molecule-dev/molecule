/**
 * `@molecule/app-image-gallery-editor-vue` — hero drop zone + side grid of
 * thumbnail slots, the Vue counterpart of `@molecule/app-image-gallery-editor-react`
 * with the same props and the same DOM for the same input. Click an empty slot
 * or the drop zone to upload, or drop image files on the drop zone to fill the
 * empty slots in order; click a filled slot to remove (confirmed via the
 * shared `ConfirmDialog` from `@molecule/app-ui-vue`). The drop zone and every
 * slot are keyboard buttons: Enter and Space do what a click does.
 *
 * Stateless about persistence — the consumer owns the slot array and handles
 * uploads via `onPickFiles`. The editor owns the lifetime of default local previews.
 *
 * @example
 * ```ts
 * import { createApp, defineComponent, h, ref } from 'vue'
 * import type { PickedFile } from '@molecule/app-filesystem'
 * import { ImageGalleryEditor } from '@molecule/app-image-gallery-editor-vue'
 * import { uploadImage } from './uploads.js'
 *
 * const GalleryEditor = defineComponent({
 *   setup() {
 *     const slots = ref<(string | null)[]>(Array(4).fill(null))
 *     return () =>
 *       h(ImageGalleryEditor, {
 *         slots: slots.value,
 *         onChange: (next) => (slots.value = next),
 *         onPickFiles: (files: readonly PickedFile[]) => Promise.all(files.map(uploadImage)),
 *         counter: `${slots.value.filter(Boolean).length} / 24 Photos`,
 *       })
 *   },
 * })
 *
 * createApp(GalleryEditor).mount('#app')
 * ```
 *
 * @remarks
 * - Styling is 100% ClassMap (`getClassMap()` / `cm.*`) — the editor renders
 *   correctly out of the box under any bonded styling library and needs NO
 *   per-app Tailwind `@source` scan of this package. The few `style` values
 *   (grid-column span, aspect ratio, corner radius, the dashed drop-zone
 *   border, `object-fit`, dim opacity, `display:none`) are the documented
 *   ClassMap-can't-express cases and use real theme tokens.
 * - Icons are real SVG glyphs from `@molecule/app-ui-vue`'s `Icon`
 *   (`upload`, `trash`, and the `emptySlotIcon` — a typed `IconName`) — NO
 *   Material Symbols font to load. Requires a bonded `@molecule/app-icons` set.
 * - The filled-slot delete affordance is always visible (touch-friendly)
 *   rather than hover-revealed.
 * - Its text (the drop-zone heading and hint, the remove confirmation, the
 *   slots' accessible names) flows through `t()` with English `defaultValue`
 *   fallbacks under the `imageGalleryEditor.*` keys, so the
 *   `@molecule/app-locales-image-gallery-editor` companion bond (or the host
 *   app's own locale) translates it. `dropZoneTitle`, `dropZoneHint` and
 *   `confirmRemoveMessage` override it per instance, and node-valued props
 *   arrive as a prop AND a same-named slot.
 * - A drop that carries a file other than an image is refused, as the picker
 *   (`accept="image/*"`) would refuse it.
 * - `getClassMap()` requires a bonded ClassMap for the layout primitives.
 *
 * @module
 */

export * from './ImageGalleryEditor.js'
export * from './types.js'
