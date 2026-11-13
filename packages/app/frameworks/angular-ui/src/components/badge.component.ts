/**
 * Badge component (React parity).
 *
 * @module
 */

import { Component } from '@angular/core'

import type { ColorVariant, Size, UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { styleText } from '../utilities/style.js'

/**
 * Badge component.
 *
 * The host element is the `<span>` React renders (`span[mol-badge]`); the
 * color variant maps to `badge({ variant })` exactly as React's `Badge`.
 */
@Component({
  selector: 'span[mol-badge]',
  standalone: true,
  inputs: ['color', 'variant', 'size', 'rounded', 'className', 'style', 'testId'],
  host: {
    '[class]': 'classes()',
    '[style]': 'hostStyle()',
    '[attr.data-testid]': 'testId',
  },
  template: `<ng-content></ng-content>`,
})
export class Badge {
  /** Named color variant (`primary`, `success`, …). */
  color: ColorVariant = 'primary'
  /** Visual style (kept for React prop parity; the class map keys off `color`). */
  variant: 'solid' | 'outline' | 'subtle' = 'solid'
  /** Badge size. */
  size?: Size
  /** Whether the badge is fully rounded (default) or square. */
  rounded = true
  /** Extra classes joined onto the badge classes. */
  className?: string
  /** Inline style object (React camelCase). */
  style?: Record<string, unknown>
  /** `data-testid` for the badge. */
  testId?: string

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the badge class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(
      this.cm().badge({ variant: this.color, size: this.size }),
      !this.rounded && this.cm().badgeSquare,
      this.className,
    )
  }

  /**
   * Serializes the inline style.
   * @returns The style attribute text.
   */
  hostStyle(): string | null {
    return styleText(this.style)
  }
}
