/**
 * `@molecule/app-image-gallery-editor-angular` — hero drop zone + side grid
 * of thumbnail slots, the Angular counterpart of
 * `@molecule/app-image-gallery-editor-react` with the same props and the same
 * DOM for the same input. Click an empty slot or the drop zone to upload, or
 * drop image files on the drop zone to fill the empty slots in order; click a
 * filled slot to remove (confirmed via the shared `ConfirmDialog` from
 * `@molecule/app-ui-angular`). The drop zone and every slot are keyboard
 * buttons: Enter and Space do what a click does.
 *
 * Stateless about persistence — the consumer owns the slot array and handles
 * uploads via `onPickFiles` (defaults to local object URLs for preview).
 *
 * @example
 * ```ts
 * import { Component, signal } from '@angular/core'
 * import { ImageGalleryEditor } from '@molecule/app-image-gallery-editor-angular'
 *
 * @Component({
 *   selector: 'app-gallery',
 *   standalone: true,
 *   imports: [ImageGalleryEditor],
 *   template: `
 *     <section
 *       mol-image-gallery-editor
 *       [slots]="slots()"
 *       (change)="slots.set($event)"
 *       [onPickFiles]="persist"
 *     >
 *       <h3 slot="header">Image Gallery</h3>
 *     </section>
 *   `,
 * })
 * export class GalleryComponent {
 *   readonly slots = signal<(string | null)[]>(Array(4).fill(null))
 *
 *   // Upload each file, return persisted URLs (null keeps a slot empty).
 *   readonly persist = async (files: FileList): Promise<(string | null)[]> =>
 *     Array.from(files).map((f) => URL.createObjectURL(f))
 * }
 * ```
 *
 * @remarks
 * - Styling is 100% ClassMap (`getClassMap()` / `cm.*`) — the editor renders
 *   correctly out of the box under any bonded styling library and needs NO
 *   per-app Tailwind `@source` scan of this package. The few `style` values
 *   (grid-column span, aspect ratio, corner radius, the dashed drop-zone
 *   border, `object-fit`, dim opacity, `display:none`) are the documented
 *   ClassMap-can't-express cases and use real theme tokens.
 * - Icons are real SVG glyphs from `@molecule/app-ui-angular`'s `Icon`
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
 *   are projected content (`[slot=<name>]`).
 * - A drop that carries a file other than an image is refused, as the picker
 *   (`accept="image/*"`) would refuse it.
 * - `getClassMap()` requires a bonded ClassMap for the layout primitives.
 *
 * @module
 */

export * from './image-gallery-editor.component.js'
export * from './types.js'
