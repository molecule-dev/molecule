/**
 * ListingCard component (React parity).
 *
 * @module
 */

import { Component } from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { ListingCardActions } from './listing-card-actions.component.js'
import { ListingCardToggle } from './listing-card-toggle.component.js'
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
 *
 * A supplied `toggle` renders the counted card action after the content,
 * outside any links in it — React's `<ListingCardActions><ListingCardToggle>`
 * pair, in the same DOM order.
 */
@Component({
  selector: 'div[mol-listing-card]',
  standalone: true,
  imports: [ListingCardActions, ListingCardToggle],
  inputs: ['toggle', 'onClick', 'className', 'dataMolId'],
  host: {
    '[class]': 'classes()',
    '[attr.data-mol-id]': 'dataMolId ?? null',
    '(click)': 'handleClick($event)',
  },
  // prettier-ignore
  template: `<div [class]="stackClasses()"><ng-content></ng-content>@if (toggle) {<div mol-listing-card-actions><button mol-listing-card-toggle [value]="toggle.value" [commit]="toggle.commit" [activeLabel]="toggle.activeLabel" [inactiveLabel]="toggle.inactiveLabel" [onError]="toggle.onError" [dataMolId]="toggle.dataMolId" [variant]="toggle.variant" [color]="toggle.color" [size]="toggle.size" [fullWidth]="toggle.fullWidth ?? false" [disabled]="toggle.disabled ?? false" [className]="toggle.className" [testId]="toggle.testId" [automationId]="toggle.automationId"></button></div>}</div>`,
})
export class ListingCard {
  /** Renders a counted native toggle after the content, outside any links in the content. */
  toggle?: ListingCardProps['toggle']
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
