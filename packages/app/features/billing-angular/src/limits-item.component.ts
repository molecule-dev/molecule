/**
 * LimitsItem component (React parity).
 *
 * @module
 */

import { Component } from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Icon } from '@molecule/app-ui-angular'

import type { LimitsItemProps } from './types.js'

/**
 * LimitsItem component.
 *
 * Single row in a tier's feature list — a check (or em-dash) icon followed by
 * the row label. The host IS the `<li>` (`li[mol-pricing-limits-item]`),
 * matching React's root exactly; the label is projected content.
 */
@Component({
  selector: 'li[mol-pricing-limits-item]',
  standalone: true,
  imports: [Icon],
  inputs: ['included'],
  host: { '[class]': 'classes()' },
  // prettier-ignore
  template: `<svg mol-icon-root [name]="iconName()" [size]="18" [className]="iconClass()" [ariaHidden]="'true'"></svg><span><ng-content></ng-content></span>`,
})
export class LimitsItem implements LimitsItemProps {
  /**
   * Whether this feature is included in the tier. When `false`, the row
   * renders muted with a dash glyph instead of the check icon. Defaults to
   * `true`.
   */
  included?: boolean

  /** The bonded ClassMap (styling tokens resolve at render time). */
  protected readonly cm: UIClassMap = getClassMap()

  /**
   * Whether the row counts as included (React's `included = true` default).
   *
   * @returns True unless the caller passed `false`.
   */
  isIncluded(): boolean {
    return this.included ?? true
  }

  /**
   * The row's class list.
   *
   * @returns The class string React computes for the `<li>`.
   */
  classes(): string {
    return this.cm.cn(
      this.cm.flex({ direction: 'row', align: 'start', gap: 'sm' }),
      this.cm.textSize('sm'),
      !this.isIncluded() && this.cm.textMuted,
    )
  }

  /**
   * The glyph name for the row's mark.
   *
   * @returns `check-circle` when included, `minus` otherwise.
   */
  iconName(): 'check-circle' | 'minus' {
    return this.isIncluded() ? 'check-circle' : 'minus'
  }

  /**
   * The mark's class list.
   *
   * @returns The class string React computes for the icon.
   */
  iconClass(): string {
    return this.isIncluded() ? this.cm.textPrimary : this.cm.textSubtle
  }
}
