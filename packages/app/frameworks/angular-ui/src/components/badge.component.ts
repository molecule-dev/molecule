/**
 * Badge component (React parity).
 *
 * @module
 */

import { Component, ElementRef, inject } from '@angular/core'

import type { ColorVariant, Size, UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { type HasElement, hostElement } from '../utilities/element.js'
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
  inputs: [
    'color',
    'variant',
    'size',
    'rounded',
    'className',
    'style',
    'testId',
    'automationId',
    'dataMolId: data-mol-id',
  ],
  host: {
    '[class]': 'classes()',
    '[style]': 'hostStyle()',
    '[attr.data-testid]': 'testId',
    '[attr.data-mol-id]': 'molId()',
  },
  template: `<ng-content></ng-content>`,
})
export class Badge implements HasElement<HTMLSpanElement> {
  private readonly host: ElementRef<HTMLSpanElement> = inject(ElementRef)
  /** The element a caller's ref receives: the host `<span>`. */
  readonly element = hostElement(this.host)

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
  /** `data-mol-id` automation id (React's `automationId`). */
  automationId?: string
  /** A `data-mol-id` given as a plain rest attribute (React's `rootProps` precedence). */
  dataMolId?: string

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
   * The `data-mol-id` value (`automationId` wins over a rest `data-mol-id`).
   * @returns The attribute value.
   */
  molId(): string | undefined {
    return (
      this.automationId ??
      this.dataMolId ??
      this.host.nativeElement.getAttribute('data-mol-id') ??
      undefined
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
