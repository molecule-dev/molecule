/**
 * ColorSwatchPicker component (React parity).
 *
 * @module
 */

import { Component } from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { styleText } from '@molecule/app-ui-angular'

import type { ColorSwatch } from './types.js'

/**
 * ColorSwatchPicker component.
 *
 * Grid of colored circles with single-select state — the Angular counterpart
 * of `@molecule/app-color-swatch-picker-react`'s `ColorSwatchPicker`: the
 * same props (React names), the same ClassMap tokens, and the same DOM for
 * the same input. Used for tag colors, label colors, theme accent swatches,
 * etc. The host IS the outer `<div>` (`div[mol-color-swatch-picker]`),
 * matching React's root exactly; the node prop `preview` is projected as
 * `[slot=preview]` content, rendered below the group like React's `preview`
 * element.
 */
@Component({
  selector: 'div[mol-color-swatch-picker]',
  standalone: true,
  inputs: ['swatches', 'value', 'onChange', 'size', 'gap', 'className', 'ariaLabel'],
  host: {
    '[class]': 'classes()',
  },
  template: `<div role="radiogroup" [attr.aria-label]="ariaLabel ?? null" [class]="groupClasses()">
      @for (swatch of swatches; track swatch.value) {
        <button
          type="button"
          role="radio"
          [attr.aria-checked]="isSelected(swatch) ? 'true' : 'false'"
          [attr.aria-label]="swatchLabel(swatch)"
          [attr.data-mol-id]="'color-swatch-' + swatch.value"
          [attr.data-selected]="isSelected(swatch) ? 'true' : 'false'"
          (click)="pick(swatch)"
          [class]="buttonClasses()"
          [style]="buttonStyle(swatch)"
        ></button>
      }
    </div>
    <ng-content select="[slot=preview]"></ng-content>`,
})
export class ColorSwatchPicker {
  /** Swatch definitions. */
  swatches: ColorSwatch[] = []
  /** Currently selected swatch value. */
  value?: string
  /**
   * Called when a swatch is picked (React's `onChange`) — the component only
   * calls it on a click, so it is a plain input.
   */
  onChange?: (value: string) => void
  /** Swatch diameter in pixels (React's `size` default 28, applied at read time). */
  size?: number
  /** Gap between swatches (React's `gap` default `'sm'`, applied at read time). */
  gap?: 'xs' | 'sm' | 'md'
  /** Extra classes. */
  className?: string
  /** `aria-label` for the group. */
  ariaLabel?: string

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The wrapper class list (React's `cm.cn(cm.stack(2), className)`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().stack(2), this.className)
  }

  /**
   * The group class list (React's
   * `cm.flex({ align: 'center', gap, wrap: 'wrap' })`).
   * @returns The class string.
   */
  groupClasses(): string {
    return this.cm().flex({ align: 'center', gap: this.gap ?? 'sm', wrap: 'wrap' })
  }

  /**
   * One swatch button's class list (React's
   * `cm.cn(cm.roundedFull, cm.cursorPointer, cm.touchTargetCompact)`).
   * @returns The class string.
   */
  buttonClasses(): string {
    return this.cm().cn(
      this.cm().roundedFull,
      this.cm().cursorPointer,
      this.cm().touchTargetCompact,
    )
  }

  /**
   * Whether a swatch is the selected one (React's `s.value === value`).
   * @param swatch - The swatch.
   * @returns Whether it is selected.
   */
  isSelected(swatch: ColorSwatch): boolean {
    return swatch.value === this.value
  }

  /**
   * A swatch's accessible label (React's `s.label ?? s.value`).
   * @param swatch - The swatch.
   * @returns The label.
   */
  swatchLabel(swatch: ColorSwatch): string {
    return swatch.label ?? swatch.value
  }

  /**
   * One swatch button's inline style text (React's
   * `style={{ width: size, height: size, background: s.color, outline: …,
   * outlineOffset: 2, border: 'none' }}`), serialized the way React writes
   * it; null when there is nothing to set.
   *
   * The background IS the caller's data (the colour being picked), not a
   * design token, and a `cm.button()` fill would hide it — hence the one
   * inline style. Cursor and the compact touch floor come from the ClassMap.
   *
   * @param swatch - The swatch.
   * @returns The style text or null.
   */
  buttonStyle(swatch: ColorSwatch): string | null {
    return styleText({
      width: this.size ?? 28,
      height: this.size ?? 28,
      background: swatch.color,
      outline: this.isSelected(swatch) ? '2px solid currentColor' : 'none',
      outlineOffset: 2,
      border: 'none',
    })
  }

  /**
   * Activate a swatch: report the pick through `onChange` (React's
   * `onClick={() => onChange(s.value)}`).
   * @param swatch - The swatch the user picked.
   */
  pick(swatch: ColorSwatch): void {
    this.onChange?.(swatch.value)
  }
}
