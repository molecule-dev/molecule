/**
 * Spinner component (React parity).
 *
 * @module
 */

import { Component } from '@angular/core'

import { t } from '@molecule/app-i18n'
import type { Size, UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { styleText } from '../utilities/style.js'

/** Color names the class map knows — anything else is a raw CSS color. */
const NAMED_COLORS = ['primary', 'secondary', 'success', 'warning', 'error', 'info']

/**
 * Spinner component.
 *
 * The host element is the `<div role="status">` React renders. A raw CSS
 * color (not a known color name) is expressed as inline border colors, and
 * `data-*`/`aria-*` rest props land on the host (React's spread target).
 */
@Component({
  selector: 'div[mol-spinner]',
  standalone: true,
  inputs: ['size', 'color', 'label', 'className', 'style', 'testId'],
  host: {
    '[attr.role]': '"status"',
    '[attr.aria-label]': 'ariaLabel()',
    '[class]': 'classes()',
    '[style]': 'hostStyle()',
    '[attr.data-testid]': 'testId',
  },
  template: `@if (label) {
    <span [class]="cm().srOnly">{{ label }}</span>
  }`,
})
export class Spinner {
  /** Spinner size. */
  size: Size = 'md'
  /** Named color variant or a raw CSS color. */
  color?: string
  /** Accessible label; also renders a screen-reader-only text node. */
  label?: string
  /** Extra classes joined onto the spinner classes. */
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
   * The accessible label (localized default when not given).
   * @returns The aria-label text.
   */
  ariaLabel(): string {
    return this.label || t('ui.spinner.loading', undefined, { defaultValue: 'Loading' })
  }

  /**
   * Computes the spinner class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().spinner({ size: this.size }), this.className)
  }

  /**
   * Serializes the merged inline style (caller style plus a raw-color border
   * override when `color` is a CSS color rather than a named variant).
   * @returns The style attribute text.
   */
  hostStyle(): string | null {
    const colorStyle =
      this.color &&
      typeof this.color === 'string' &&
      !NAMED_COLORS.includes(this.color as (typeof NAMED_COLORS)[number])
        ? { borderColor: this.color, borderTopColor: 'transparent' }
        : undefined
    return styleText({ ...this.style, ...colorStyle })
  }
}
