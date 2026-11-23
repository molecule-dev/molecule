/**
 * NotificationBadge component (React parity).
 *
 * @module
 */

import { Component } from '@angular/core'

import { useHostPresence } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { NotificationBadgeProps } from './types.js'

// Each variant maps to the background class emitted by a real ClassMap theme
// token. `neutral` uses the `surface-secondary` surface token (what
// `cm.surfaceSecondary` resolves to) — a visible neutral fill in both light and
// dark themes.
const VARIANT_BG: Record<NonNullable<NotificationBadgeProps['variant']>, string> = {
  error: 'bg-error',
  warning: 'bg-warning',
  info: 'bg-info',
  success: 'bg-success',
  neutral: 'bg-surface-secondary',
}

/**
 * NotificationBadge component.
 *
 * Small count pill — typically attached to a nav item, icon button, or inbox
 * entry. The host IS the root `<span>` (`span[mol-notification-badge]`),
 * matching React's root exactly. React renders null while the badge is hidden
 * (`hideOnZero` with a count of 0 or less); `useHostPresence` takes the host out
 * of the page in that state, so a hidden badge leaves no element behind.
 *
 * This is the Angular counterpart of `@molecule/app-notification-badge-react`'s
 * `NotificationBadge`: the same props (React names), the same ClassMap tokens,
 * and the same DOM for the same input.
 */
@Component({
  selector: 'span[mol-notification-badge]',
  standalone: true,
  inputs: ['count', 'hideOnZero', 'max', 'variant', 'className'],
  host: {
    '[attr.aria-label]': 'label()',
    '[class]': 'classes()',
    '[style.min-width]': '"20px"',
    '[style.height]': '"20px"',
  },
  template: `{{ display() }}`,
})
export class NotificationBadge {
  /** Numeric count — renders as a pill. */
  count!: number
  /** Hide the badge when `count` is 0 (defaults to true at read time). */
  hideOnZero?: boolean
  /** When `count > max`, renders as `max+` (defaults to 99 at read time). */
  max?: number
  /** Accent color (defaults to `'error'` at read time). */
  variant?: NonNullable<NotificationBadgeProps['variant']>
  /** Extra classes. */
  className?: string

  constructor() {
    // Leaves no element in the page while the badge is hidden (React renders null).
    useHostPresence(() => this.isVisible())
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The pill's class list (React's `cm.cn(cm.flex({…}), cm.sp('px', 1),
   * cm.roundedFull, cm.textSize('xs'), cm.fontWeight('bold'), VARIANT_BG[variant], className)`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(
      this.cm().flex({ align: 'center', justify: 'center' }),
      this.cm().sp('px', 1),
      this.cm().roundedFull,
      this.cm().textSize('xs'),
      this.cm().fontWeight('bold'),
      VARIANT_BG[this.variant ?? 'error'],
      this.className,
    )
  }

  /**
   * The accessible label — React's `aria-label={`${count}`}`.
   * @returns The true count as text.
   */
  label(): string {
    return `${this.count}`
  }

  /**
   * The rendered text — React's `count > max ? `${max}+` : String(count)`.
   * @returns The display text.
   */
  display(): string {
    const max = this.max ?? 99
    return this.count > max ? `${max}+` : String(this.count)
  }

  /**
   * Whether the badge renders (React's `!(hideOnZero && count <= 0)`).
   * @returns True while the badge shows.
   */
  isVisible(): boolean {
    return !((this.hideOnZero ?? true) && this.count <= 0)
  }
}
