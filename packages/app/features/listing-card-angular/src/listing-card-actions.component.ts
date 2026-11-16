/**
 * ListingCardActions component (React parity).
 *
 * @module
 */

import { Component } from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { ListingCardActionsProps } from './types.js'

/**
 * ListingCardActions component.
 *
 * Bottom action row of a listing card. The host IS the root `div`
 * (`div[mol-listing-card-actions]`), matching React's root exactly; the action
 * content is the element's default projected content.
 */
@Component({
  selector: 'div[mol-listing-card-actions]',
  standalone: true,
  inputs: ['layout', 'className'],
  host: {
    '[class]': 'classes()',
  },
  template: '<ng-content></ng-content>',
})
export class ListingCardActions {
  /** Layout — `'horizontal'` (default) fills width, `'stacked'` is vertical. */
  layout?: ListingCardActionsProps['layout']
  /** Extra classes. */
  className?: string

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the row class list (React's flex + padding tokens plus
   * `className`).
   * @returns The class string.
   */
  classes(): string {
    const cm = this.cm()
    return cm.cn(
      cm.flex({
        direction: this.layout === 'stacked' ? 'col' : 'row',
        gap: 'sm',
        align: 'stretch',
      }),
      cm.sp('p', 3),
      this.className,
    )
  }
}
