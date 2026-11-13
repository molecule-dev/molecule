/**
 * Separator component (React parity).
 *
 * @module
 */

import { Component } from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { styleText } from '../utilities/style.js'

/**
 * Separator component.
 *
 * Decorative separators render `role="none"` and no orientation; a semantic
 * one (`decorative={false}`) renders `role="separator"` plus
 * `aria-orientation`.
 */
@Component({
  selector: 'div[mol-separator]',
  standalone: true,
  inputs: ['orientation', 'decorative', 'className', 'style', 'testId'],
  host: {
    '[attr.role]': 'decorative ? "none" : "separator"',
    '[attr.aria-orientation]': 'decorative ? null : orientation',
    '[class]': 'classes()',
    '[style]': 'hostStyle()',
    '[attr.data-testid]': 'testId',
  },
  template: '',
})
export class Separator {
  /** Orientation of the separator. */
  orientation: 'horizontal' | 'vertical' = 'horizontal'
  /** Decorative separators are purely visual. */
  decorative = true
  /** Extra classes. */
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
   * Computes the separator class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().separator({ orientation: this.orientation }), this.className)
  }

  /**
   * Serializes the inline style.
   * @returns The style attribute text.
   */
  hostStyle(): string | null {
    return styleText(this.style)
  }
}
