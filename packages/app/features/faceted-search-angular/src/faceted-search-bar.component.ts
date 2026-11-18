/**
 * FacetedSearchBar component (React parity).
 *
 * @module
 */

import { Component } from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * FacetedSearchBar component.
 *
 * Fixed-position horizontal container for a row of faceted-search primitives
 * (segmented control, filter pills, more-filters drawer). The host IS the
 * React root `<div>` (`div[mol-faceted-search-bar]`), carrying React's
 * `data-mol-id`, its `top` inline style and its class list. Children compose
 * freely as the element's projected content.
 */
@Component({
  selector: 'div[mol-faceted-search-bar]',
  standalone: true,
  inputs: ['topOffsetPx', 'className'],
  host: {
    '[class]': 'classes()',
    '[attr.data-mol-id]': "'filter-bar'",
    '[style.top]': 'topOffset()',
  },
  template: `<ng-content></ng-content>`,
})
export class FacetedSearchBar {
  /** Fixed top offset in px (defaults to 64 at read time, as React's default parameter). */
  topOffsetPx?: number
  /** Extra classes on the container. */
  className?: string

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the container's class list, exactly as React composes it.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(
      this.cm().flex({ align: 'center', gap: 'md' }),
      this.cm().sp('px', 6),
      this.cm().sp('py', 3),
      this.cm().surface,
      this.cm().w('full'),
      this.cm().facetedSearchBar,
      this.className,
    )
  }

  /**
   * The container's `top` offset, React's `top: \`${topOffsetPx}px\``.
   * @returns The CSS length (`64px` by default).
   */
  topOffset(): string {
    return `${this.topOffsetPx ?? 64}px`
  }
}
