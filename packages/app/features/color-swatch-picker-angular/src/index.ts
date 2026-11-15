/**
 * Angular color-swatch picker — the Angular counterpart of
 * `@molecule/app-color-swatch-picker-react`, with the same props (React
 * names) and the same DOM for the same input.
 *
 * Exports `<ColorSwatchPicker>` — grid of colored circles with single-select
 * state, for tag colors, label colors, theme accent swatches, etc. Apps
 * switching framework change only the package name in their imports.
 *
 * @example
 * ```ts
 * import { Component, signal } from '@angular/core'
 * import { ColorSwatchPicker } from '@molecule/app-color-swatch-picker-angular'
 *
 * @Component({
 *   selector: 'app-tag-color',
 *   standalone: true,
 *   imports: [ColorSwatchPicker],
 *   template: `
 *     <div
 *       mol-color-swatch-picker
 *       [swatches]="swatches"
 *       [value]="selected()"
 *       [onChange]="pick"
 *       [ariaLabel]="'Tag color'"
 *     >
 *       <div slot="preview">Live preview</div>
 *     </div>
 *   `,
 * })
 * export class TagColorPicker {
 *   swatches = [
 *     { value: 'red', color: '#ef4444', label: 'Red' },
 *     { value: 'blue', color: '#3b82f6', label: 'Blue' },
 *     { value: 'green', color: '#22c55e', label: 'Green' },
 *   ]
 *   selected = signal('red')
 *   pick = (value: string): void => this.selected.set(value)
 * }
 * ```
 *
 * @remarks
 * All text (`label` per swatch, `ariaLabel` for the group) is
 * consumer-provided — pass translated strings via `t()`; the component has no
 * built-in copy. Selection is fully controlled: persist the picked value and
 * re-render with the new `value` input. Swatches render as `role="radio"`
 * buttons sized by the `size` input (default 28px) with the CSS `color` you
 * provide. The node prop `preview` is projected content: selected by
 * `[slot=preview]` and rendered below the group.
 *
 * @module
 */

export * from './color-swatch-picker.component.js'
export * from './types.js'
