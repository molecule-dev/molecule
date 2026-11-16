/**
 * NotificationDot component (React parity).
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

import type { NotificationDotProps } from './types.js'

// Each variant maps to the background class emitted by a real ClassMap theme
// token. `neutral` uses the `surface-secondary` surface token (what
// `cm.surfaceSecondary` resolves to) — a visible neutral fill in both light and
// dark themes.
const VARIANT_BG: Record<NonNullable<NotificationDotProps['variant']>, string> = {
  error: 'bg-error',
  warning: 'bg-warning',
  info: 'bg-info',
  success: 'bg-success',
  neutral: 'bg-surface-secondary',
}

/**
 * NotificationDot component.
 *
 * Tiny unread / presence indicator. The host IS the root `<span>`
 * (`span[mol-notification-dot]`), matching React's root exactly, with
 * `aria-hidden` and every inline declaration applied through host bindings
 * (the CSSOM, as react-dom does). React renders null when `visible` is false;
 * Angular's host element always exists, so it is detached from the DOM in that
 * state and restored when the dot is shown again.
 *
 * This is the Angular counterpart of `@molecule/app-notification-badge-react`'s
 * `NotificationDot`: the same props (React names), the same DOM for the same
 * input.
 */
@Component({
  selector: 'span[mol-notification-dot]',
  standalone: true,
  inputs: ['visible', 'variant', 'size', 'position', 'className'],
  host: {
    'aria-hidden': 'true',
    '[class]': 'classes()',
    '[style.display]': 'displayValue()',
    '[style.width]': 'sizePx()',
    '[style.height]': 'sizePx()',
    '[style.position]': 'isCorner() ? "absolute" : null',
    '[style.top]': 'cornerValue("top")',
    '[style.right]': 'cornerValue("right")',
  },
  template: '',
})
export class NotificationDot implements AfterViewInit, DoCheck, OnDestroy {
  /** When false, nothing is rendered (defaults to true at read time). */
  visible?: boolean
  /** Color variant (defaults to `'error'` at read time). */
  variant?: NonNullable<NotificationDotProps['variant']>
  /** Dot size in pixels (defaults to 8 at read time). */
  size?: number
  /** Positioning (defaults to `'inline'` at read time). */
  position?: NonNullable<NotificationDotProps['position']>
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
   * The dot's class list (React's `cm.cn(cm.roundedFull, VARIANT_BG[variant], className)`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().roundedFull, VARIANT_BG[this.variant ?? 'error'], this.className)
  }

  /**
   * The dot's diameter, in pixels — React's `size = 8` default parameter.
   * @returns The width/height.
   */
  sizePx(): string {
    return `${this.size ?? 8}px`
  }

  /**
   * Whether the dot is positioned absolutely at the parent's top-right
   * (React's `position === 'corner'`).
   * @returns True for the corner position.
   */
  isCorner(): boolean {
    return (this.position ?? 'inline') === 'corner'
  }

  /**
   * React's inline-position `display` declaration, or null for the corner
   * position (which sets no display).
   * @returns `'inline-block'`, or null.
   */
  displayValue(): string | null {
    return this.isCorner() ? null : 'inline-block'
  }

  /**
   * One corner-only declaration (React's `{ position: 'absolute', top: 2,
   * right: 2 }` for `position="corner"`).
   * @param edge - The edge to set.
   * @returns `'2px'` for `top`/`right` when the dot is a corner dot, otherwise null.
   */
  cornerValue(edge: 'top' | 'right'): string | null {
    if (!this.isCorner()) return null
    return edge === 'top' || edge === 'right' ? '2px' : null
  }

  /**
   * Whether the dot renders (React's `visible = true` default parameter).
   * @returns True while the dot shows.
   */
  isVisible(): boolean {
    return this.visible ?? true
  }

  /**
   * Removes the host element from the DOM while React would render null, and
   * restores it when the dot is shown again.
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
