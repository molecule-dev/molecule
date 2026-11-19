/**
 * Separator component (React parity).
 *
 * @module
 */

import { Component, ElementRef, inject } from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { type HasElement, hostElement } from '../utilities/element.js'
import { styleText } from '../utilities/style.js'

/**
 * Props for {@link Separator} (React's `SeparatorProps`, in Angular's form).
 */
export interface SeparatorProps {
  /** Orientation of the separator. Defaults to `horizontal`. */
  orientation?: 'horizontal' | 'vertical'
  /** Decorative separators are purely visual (default true). */
  decorative?: boolean
  /** Extra classes. */
  className?: string
  /** Inline style object (React camelCase). */
  style?: Record<string, unknown>
  /** `data-testid`. */
  testId?: string
  /** `data-mol-id` automation id (React's `automationId`). */
  automationId?: string
}

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
  inputs: [
    'orientation',
    'decorative',
    'className',
    'style',
    'testId',
    'automationId',
    'dataMolId: data-mol-id',
  ],
  host: {
    '[attr.role]': 'decorative ? "none" : "separator"',
    '[attr.aria-orientation]': 'decorative ? null : orientation',
    '[class]': 'classes()',
    '[style]': 'hostStyle()',
    '[attr.data-testid]': 'testId',
    '[attr.data-mol-id]': 'molId()',
  },
  template: '',
})
export class Separator implements HasElement<HTMLDivElement> {
  private readonly host: ElementRef<HTMLDivElement> = inject(ElementRef)
  /** The element a caller's ref receives: the host `<div>`. */
  readonly element = hostElement(this.host)

  /** Orientation of the separator. */
  orientation: SeparatorProps['orientation'] = 'horizontal'
  /** Decorative separators are purely visual. */
  decorative: SeparatorProps['decorative'] = true
  /** Extra classes. */
  className?: SeparatorProps['className']
  /** Inline style object (React camelCase). */
  style?: SeparatorProps['style']
  /** `data-testid`. */
  testId?: SeparatorProps['testId']
  /** `data-mol-id` automation id (React's `automationId`). */
  automationId?: SeparatorProps['automationId']
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
   * Computes the separator class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().separator({ orientation: this.orientation }), this.className)
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
