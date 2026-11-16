/**
 * NotificationBadge component (React parity).
 *
 * @module
 */

import {
  type AfterViewInit,
  Component,
  type DoCheck,
  ElementRef,
  inject,
  type OnDestroy,
} from '@angular/core'

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
 * (`hideOnZero` with a count of 0 or less); Angular's host element always
 * exists, so it is detached from the DOM in that state and restored when the
 * count shows it again.
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
export class NotificationBadge implements AfterViewInit, DoCheck, OnDestroy {
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

  /** The host element (the root `<span>`), for the null-render detach. */
  private readonly el = inject(ElementRef)
  /** Where the detached host lives, for the restore. */
  private detachedParent: Node | null = null
  /** The node the detached host is restored before. */
  private detachedAnchor: Node | null = null

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

  /**
   * Removes the host element from the DOM while React would render null, and
   * restores it when the badge is shown again.
   */
  syncHostVisibility(): void {
    const host = this.el.nativeElement as HTMLElement
    if (!this.isVisible()) {
      if (host.isConnected) {
        this.detachedParent = host.parentNode
        this.detachedAnchor = host.nextSibling
        host.parentNode?.removeChild(host)
      }
    } else if (this.detachedParent && !host.isConnected) {
      this.detachedParent.insertBefore(host, this.detachedAnchor)
      this.detachedParent = null
      this.detachedAnchor = null
    }
  }

  /**
   * Reconciles host visibility once the view is in the document: the first
   * ngDoCheck of a cycle runs before Angular has inserted a freshly created
   * view, so the mount-time decision is applied here.
   */
  ngAfterViewInit(): void {
    this.syncHostVisibility()
  }

  /** Re-reconciles host visibility after input writes. */
  ngDoCheck(): void {
    this.syncHostVisibility()
  }

  /** Restores the host before Angular removes it (unmount). */
  ngOnDestroy(): void {
    const host = this.el.nativeElement as HTMLElement
    // The host must be inside its parent for Angular's own removal to succeed.
    if (!host.isConnected && this.detachedParent) {
      this.detachedParent.insertBefore(host, this.detachedAnchor)
      this.detachedParent = null
      this.detachedAnchor = null
    }
  }
}
