/**
 * Angular adjustment slider feature for molecule.dev.
 *
 * Bipolar (zero-center) numeric slider tuned for photo-editor / DAW /
 * animation parameter controls (brightness, contrast, saturation, exposure,
 * gain, pan, etc.). The Angular counterpart of
 * `@molecule/app-adjustment-slider-react`: same exports, same props (React
 * names), same DOM for the same input.
 *
 * @example
 * ```ts
 * import { Component, signal } from '@angular/core'
 * import { AdjustmentSlider } from '@molecule/app-adjustment-slider-angular'
 *
 * @Component({
 *   selector: 'app-exposure',
 *   standalone: true,
 *   imports: [AdjustmentSlider],
 *   template: `
 *     <div
 *       mol-adjustment-slider
 *       label="Exposure"
 *       [value]="exposure()"
 *       [onChange]="setExposure"
 *       [min]="-100"
 *       [max]="100"
 *       [step]="1"
 *       [bipolar]="true"
 *       unit="%"
 *     ></div>
 *   `,
 * })
 * export class Exposure {
 *   readonly exposure = signal(0)
 *   readonly setExposure = (next: number) => this.exposure.set(next)
 * }
 * ```
 *
 * @remarks
 * - Requires a bonded ClassMap (`getClassMap()`) — rendering throws without
 *   one. The `aria-label`s read through the binding's reactive
 *   `useTranslation()`, so a locale switch re-renders them.
 * - The host IS React's root `<div>`; the numeric display doubles as the reset
 *   button, and double-clicking the range input resets it too.
 *
 * @module
 */

export * from './adjustment-slider.component.js'
export * from './types.js'
export * from './utilities.js'
