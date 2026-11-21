/**
 * LimitsList component (React parity).
 *
 * @module
 */

import { Component } from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * LimitsList component.
 *
 * The Angular counterpart of `@molecule/app-billing-react`'s `LimitsList`:
 * the container of a tier's feature list, rendered as a stacked `<ul>`. The
 * host IS that `<ul>` (`ul[mol-pricing-limits-list]`), matching React's root
 * exactly; the rows are projected content.
 */
@Component({
  selector: 'ul[mol-pricing-limits-list]',
  standalone: true,
  host: {
    '[class]': 'classes()',
    'data-mol-id': 'pricing-limits-list',
  },
  template: `<ng-content></ng-content>`,
})
export class LimitsList {
  /** The bonded ClassMap (styling tokens resolve at render time). */
  protected readonly cm: UIClassMap = getClassMap()

  /**
   * The list's class list.
   *
   * @returns The class string React computes for the `<ul>`.
   */
  classes(): string {
    return this.cm.stack(3)
  }
}
