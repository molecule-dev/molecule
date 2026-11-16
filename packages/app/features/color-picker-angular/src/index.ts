/**
 * Angular controlled HSV + RGB + HEX color picker — design canvases, photo
 * editors, animation tools, brand editors.
 *
 * The Angular counterpart of `@molecule/app-color-picker-react`: same exports,
 * same props (React names), same DOM for the same input.
 *
 * @example
 * ```ts
 * import { Component, signal } from '@angular/core'
 * import { ColorPicker } from '@molecule/app-color-picker-angular'
 *
 * @Component({
 *   selector: 'app-stroke-color',
 *   standalone: true,
 *   imports: [ColorPicker],
 *   template: `<div mol-color-picker [value]="color()" [onChange]="setColor"></div>`,
 * })
 * export class StrokeColorField {
 *   readonly color = signal('#3366ff')
 *   readonly setColor = (hex: string): void => this.color.set(hex)
 * }
 * ```
 *
 * @remarks
 * - Requires a bonded ClassMap (`getClassMap()`) and the binding's i18n
 *   provider for the translated `aria-label`s — rendering throws without a
 *   ClassMap.
 * - Controlled: the parent owns `value` and receives every change through
 *   `onChange`. Pure UI — render it inside whatever popover you prefer.
 *
 * @module
 */

export * from './color-picker.component.js'
export * from './conversions.js'
export * from './types.js'
