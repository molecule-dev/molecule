/**
 * NotificationDot component (React parity).
 *
 * @module
 */

import { Component } from '@angular/core'

import { useHostPresence } from '@molecule/app-angular'
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
 * `useHostPresence` takes the host out of the page in that state, so a hidden
 * dot leaves no element behind.
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
export class NotificationDot {
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

  constructor() {
    // Leaves no element in the page while the dot is hidden (React renders null).
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
}
