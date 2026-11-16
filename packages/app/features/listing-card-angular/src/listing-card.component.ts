/**
 * ListingCard component (React parity).
 *
 * @module
 */

import { Component } from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { ListingCardProps } from './types.js'

/**
 * ListingCard component.
 *
 * Product / property / listing card shell. The host IS the Card `div`
 * (`div[mol-listing-card]`), matching React's root exactly: the Card's
 * ClassMap classes (`cm.card({ variant: 'elevated' })` + `cm.cardPadding('md')`
 * + `cm.cursorPointer` when a click handler is supplied + `className`),
 * `data-mol-id` and the click handler live on it. The children are projected
 * content, stacked vertically in the inner `div` (`cm.stack(0)`).
 */
@Component({
  selector: 'div[mol-listing-card]',
  standalone: true,
  inputs: ['onClick', 'className', 'dataMolId'],
  host: {
    '[class]': 'classes()',
    '[attr.data-mol-id]': 'dataMolId ?? null',
    '(click)': 'handleClick($event)',
  },
  template: `<div [class]="stackClasses()"><ng-content></ng-content></div>`,
})
export class ListingCard {
  /** Click handler; receives the DOM click event (React's `onClick`). */
  onClick?: ListingCardProps['onClick']
  /** Extra classes on the outer Card. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the root class list (React's Card classes, with React's
   * `cm.cursorPointer` for a clickable card and the caller's `className`).
   * @returns The class string.
   */
  classes(): string {
    const cm = this.cm()
    return cm.cn(
      cm.card({ variant: 'elevated' }),
      cm.cardPadding('md'),
      cm.cn(this.onClick ? cm.cursorPointer : undefined, this.className),
    )
  }

  /**
   * The inner stack's class list (React's `cm.stack(0)`).
   * @returns The class string.
   */
  stackClasses(): string {
    return this.cm().stack(0)
  }

  /**
   * Forwards the click to the React-named handler with the native event.
   * @param event - The native click event.
   */
  handleClick(event: MouseEvent): void {
    this.onClick?.(event)
  }
}
