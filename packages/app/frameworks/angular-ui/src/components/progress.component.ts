/**
 * Progress component (React parity).
 *
 * @module
 */

import { Component } from '@angular/core'

import { t } from '@molecule/app-i18n'
import type { ColorVariant, Size, UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { styleText } from '../utilities/style.js'

/**
 * Progress component.
 *
 * The host is the wrapper div React renders; `aria-valuenow` is clamped into
 * `[0, max]` to match the clamped visual bar.
 */
@Component({
  selector: 'div[mol-progress]',
  standalone: true,
  inputs: [
    'value',
    'max',
    'size',
    'color',
    'showValue',
    'label',
    'indeterminate',
    'className',
    'style',
    'testId',
  ],
  host: {
    '[class]': 'classes()',
    '[style]': 'hostStyle()',
    '[attr.data-testid]': 'testId',
  },
  template: `@if (label || showValue) {
      <div [class]="cm().progressLabelContainer">
        @if (label) {
          <span [class]="cm().progressLabelText">{{ label }}</span>
        }
        @if (showValue) {
          <span [class]="cm().progressLabelText"
            ><ng-container>{{ rounded }}</ng-container
            ><ng-container>{{ '%' }}</ng-container></span
          >
        }
      </div>
    }
    <div
      [class]="cm().cn(cm().progress(), cm().progressHeight(size ?? 'md'))"
      role="progressbar"
      [attr.aria-valuenow]="indeterminate ? null : clamped"
      aria-valuemin="0"
      [attr.aria-valuemax]="max"
      [attr.aria-label]="label ?? progressLabel()"
    >
      <div [class]="barClasses()" [attr.style]="barStyle()"></div>
    </div>`,
})
export class Progress {
  /** Progress value (0–max). */
  value = 0
  /** Maximum value. */
  max = 100
  /** Progress size. */
  size?: Size
  /** Progress color. */
  color?: ColorVariant
  /** Whether the numeric value label renders. */
  showValue?: boolean
  /** Accessible label. */
  label?: string
  /** Whether the progress is indeterminate. */
  indeterminate?: boolean
  /** Extra classes joined onto the wrapper classes. */
  className?: string
  /** Inline style object (React camelCase). */
  style?: Record<string, unknown>
  /** `data-testid`. */
  testId?: string

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The percentage, clamped to [0, 100].
   * @returns The percentage.
   */
  get percent(): number {
    const max = this.max ?? 100
    return Math.min(Math.max((this.value / max) * 100, 0), 100)
  }

  /**
   * The rounded percentage shown in the value label.
   * @returns The whole percentage.
   */
  get rounded(): number {
    return Math.round(this.percent)
  }

  /**
   * The clamped aria-valuenow.
   * @returns The clamped value.
   */
  get clamped(): number {
    const max = this.max ?? 100
    return Math.min(Math.max(this.value, 0), max)
  }

  /**
   * The accessible label with the localized default.
   * @returns The label text.
   */
  progressLabel(): string {
    return t('ui.progress.label', undefined, { defaultValue: 'Progress' })
  }

  /**
   * Computes the wrapper class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().progressWrapper, this.className)
  }

  /**
   * Computes the bar class list.
   * @returns The class string.
   */
  barClasses(): string {
    return this.cm().cn(
      this.cm().progressBar(),
      this.cm().progressColor(this.color ?? 'primary'),
      this.indeterminate && this.cm().progressIndeterminate,
    )
  }

  /**
   * Serializes the bar's inline style (the translateX fill, unless indeterminate).
   * @returns The style attribute text.
   */
  barStyle(): string | null {
    if (this.indeterminate) return null
    return styleText({ transform: `translateX(-${100 - this.percent}%)` })
  }

  /**
   * Serializes the inline style.
   * @returns The style attribute text.
   */
  hostStyle(): string | null {
    return styleText(this.style)
  }
}
