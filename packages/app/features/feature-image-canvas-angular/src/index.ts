/**
 * Angular Canvas2D image-editing surface.
 *
 * Exports `<div mol-image-canvas>` — the Angular counterpart of
 * `@molecule/app-feature-image-canvas-react` with the same props and the same
 * DOM: an image rendered onto a canvas with a filter chain (brightness,
 * contrast, saturation, hue, sepia, grayscale, blur, sharpen), pointer-drag
 * panning, wheel zooming, and a `toDataURL()` export handle, plus the
 * framework-free `clamp`, `composeFilterString`, `screenToCanvas` and
 * `clampPan` helpers.
 *
 * @example
 * ```ts
 * import { Component, signal } from '@angular/core'
 * import {
 *   ImageCanvas,
 *   type ImageCanvasExportHandle,
 * } from '@molecule/app-feature-image-canvas-angular'
 *
 * @Component({
 *   selector: 'app-editor',
 *   standalone: true,
 *   imports: [ImageCanvas],
 *   template: `
 *     <div
 *       mol-image-canvas
 *       [src]="'/photo.jpg'"
 *       [filters]="filters"
 *       [zoom]="zoom()"
 *       [pan]="pan()"
 *       [onChange]="applyView"
 *       [exportRef]="exportRef"
 *     ></div>
 *   `,
 * })
 * export class Editor {
 *   protected readonly zoom = signal(1)
 *   protected readonly pan = signal({ x: 0, y: 0 })
 *   protected readonly filters = { brightness: 1.1, contrast: 1.2, sepia: 0.3 }
 *   protected readonly exportRef: { current: ImageCanvasExportHandle | null } = { current: null }
 *
 *   protected readonly applyView = (next: { zoom: number; pan: { x: number; y: number } }) => {
 *     this.zoom.set(next.zoom)
 *     this.pan.set(next.pan)
 *   }
 * }
 * ```
 *
 * @remarks
 * - The host element IS the React root: `div[mol-image-canvas]` carries
 *   `role="region"`, the aria label, the ClassMap classes and the pixel frame
 *   size. An attribute selector is used so the host is a plain `<div>`.
 * - Pan / zoom interaction is CONTROLLED-ONLY: pointer-drag and wheel events
 *   call `onChange` with the proposed `{ zoom, pan }` and never mutate
 *   internal state.
 * - Requires a bonded ClassMap and i18n provider.
 * - URL sources load with `crossOrigin="anonymous"` so `toDataURL()` is never
 *   blocked by a tainted canvas.
 *
 * @module
 */

export * from './helpers.js'
export * from './image-canvas.component.js'
export * from './types.js'
