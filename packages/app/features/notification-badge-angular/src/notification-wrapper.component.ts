/**
 * NotificationWrapper component (React parity).
 *
 * @module
 */

import { Component } from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { NotificationBadge } from './notification-badge.component.js'
import type { NotificationWrapperProps } from './types.js'

/**
 * NotificationWrapper component.
 *
 * Positions a `<NotificationBadge>` at a corner of any child element. The
 * host IS the outer `<span>` (`span[mol-notification-wrapper]`), matching
 * React's root exactly — the child is projected content (the default
 * projection) and the badge follows it inside an absolutely positioned
 * `<span>`. The wrapper becomes `relative` so the badge absolutely positions
 * correctly — wrap icon buttons, avatars, or nav entries. Same props, same DOM
 * as `@molecule/app-notification-badge-react`'s `NotificationWrapper`.
 */
@Component({
  selector: 'span[mol-notification-wrapper]',
  standalone: true,
  imports: [NotificationBadge],
  inputs: ['count', 'hideOnZero', 'variant', 'placement', 'className'],
  host: {
    '[class]': 'classes()',
    '[style.display]': '"inline-block"',
  },
  template: `<ng-content></ng-content
    ><span
      [style.position]="'absolute'"
      [style.top]="edgeValue('top')"
      [style.bottom]="edgeValue('bottom')"
      [style.right]="edgeValue('right')"
      [style.left]="edgeValue('left')"
      ><span
        mol-notification-badge
        [count]="count"
        [hideOnZero]="hideOnZeroValue()"
        [variant]="variantValue()"
      ></span
    ></span>`,
})
export class NotificationWrapper {
  /** Notification count. */
  count!: number
  /** Hide the badge when count is 0 (defaults to true at read time). */
  hideOnZero?: boolean
  /** Visual variant (defaults to `'error'` at read time). */
  variant?: NonNullable<NotificationWrapperProps['variant']>
  /** Corner placement (defaults to `'top-right'` at read time). */
  placement?: NonNullable<NotificationWrapperProps['placement']>
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
   * The wrapper's class list (React's `cm.cn(cm.position('relative'), className)`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().position('relative'), this.className)
  }

  /**
   * The badge's `hideOnZero` (React's `hideOnZero = true` default parameter,
   * forwarded to the badge).
   * @returns The hide-on-zero flag.
   */
  hideOnZeroValue(): boolean {
    return this.hideOnZero ?? true
  }

  /**
   * The badge's `variant` (React's `variant = 'error'` default parameter,
   * forwarded to the badge).
   * @returns The variant.
   */
  variantValue(): NonNullable<NotificationWrapperProps['variant']> {
    return this.variant ?? 'error'
  }

  /**
   * One corner offset (React sets `-4` on an edge only when the placement
   * includes it).
   * @param edge - The edge to set.
   * @returns `'-4px'` when the placement includes the edge, otherwise null.
   */
  edgeValue(edge: 'top' | 'bottom' | 'right' | 'left'): string | null {
    return (this.placement ?? 'top-right').includes(edge) ? '-4px' : null
  }
}
