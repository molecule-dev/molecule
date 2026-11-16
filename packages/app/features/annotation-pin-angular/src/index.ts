/**
 * Angular annotation pin / hotspot overlay primitives — the Angular
 * counterpart of `@molecule/app-annotation-pin-react`: same props (React
 * names) and the same DOM for the same input, so an app switches framework by
 * changing only the package name in its imports.
 *
 * Exports `<AnnotationPin>` (single click-to-toggle marker) and
 * `<AnnotationLayer>` (parent wrapper that manages many pins on a surface).
 * Reusable for 3d-model viewers, image annotations, map pins, and hotspot
 * tours.
 *
 * @example
 * ```ts
 * import { Component, signal } from '@angular/core'
 * import { AnnotationLayer, type Pin } from '@molecule/app-annotation-pin-angular'
 *
 * @Component({
 *   selector: 'app-image-annotator',
 *   standalone: true,
 *   imports: [AnnotationLayer],
 *   template: `
 *     <div mol-annotation-layer
 *          [pins]="pins()"
 *          [activePinId]="activeId()"
 *          (onPinClick)="select($event)"
 *          (onSurfaceClick)="addPin($event)">
 *       <img src="/floorplan.png" alt="" style="width: 100%; display: block" />
 *     </div>
 *   `,
 * })
 * export class ImageAnnotator {
 *   readonly pins = signal<Pin[]>([])
 *   readonly activeId = signal<string | null>(null)
 *
 *   select(id: string): void {
 *     this.activeId.set(id === this.activeId() ? null : id)
 *   }
 *
 *   addPin({ x, y }: { x: number; y: number }): void {
 *     const id = crypto.randomUUID()
 *     this.pins.update((pins) => [...pins, { id, position: { x, y }, label: pins.length + 1 }])
 *     this.activeId.set(id)
 *   }
 * }
 * ```
 *
 * @remarks
 * Selection is fully controlled — the layer never stores the active pin;
 * manage `activePinId` yourself and toggle it in `onPinClick`. `position` is
 * normalised 0..1 by default (fractions of the layer box, so pins re-anchor on
 * resize); pass `[normalised]="false"` for raw pixel offsets — on BOTH
 * `<AnnotationLayer>` and any directly-rendered `<AnnotationPin>`, or clicks
 * and markers will disagree. Node props are projected content in Angular
 * (`[slot=label]`, `[slot=note]`, and the layer's default content for the
 * surface) or an input carrying text / a `TemplateRef`. A bare
 * `<AnnotationPin>` needs its own positioned ancestor. Translations come from
 * the companion `@molecule/app-locales-annotation-pin` locale bond.
 *
 * @module
 */

export * from './annotation-layer.component.js'
export * from './annotation-pin.component.js'
export * from './types.js'
