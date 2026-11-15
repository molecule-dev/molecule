/**
 * PresenceDot component (React parity).
 *
 * @module
 */

import { Component } from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { PresenceStatus } from './types.js'

/** The fixed semantic hue of each presence state. */
const STATUS_COLOR: Record<PresenceStatus, string> = {
  online: '#22c55e',
  away: '#eab308',
  busy: '#ef4444',
  offline: '#94a3b8',
}

/**
 * PresenceDot component.
 *
 * Small colored circle indicating user presence. Use inline next to a name, or
 * with `position="overlay"` attached to the corner of an avatar. The host IS
 * the root `<span>` (`span[mol-presence-dot]`), matching React's root exactly;
 * every inline declaration is applied through host style bindings (the CSSOM,
 * as react-dom does). Same props, same DOM as
 * `@molecule/app-presence-indicator-react`'s `PresenceDot`.
 *
 * The default aria-label is the English string `Presence: <status>` — pass
 * `ariaLabel` (e.g. from `t()`) in localized apps.
 */
@Component({
  selector: 'span[mol-presence-dot]',
  standalone: true,
  inputs: ['status', 'size', 'position', 'corner', 'ariaLabel', 'className'],
  host: {
    role: 'status',
    '[class]': 'classes()',
    '[attr.aria-label]': 'label()',
    '[style.display]': '"inline-block"',
    '[style.width]': 'sizePx()',
    '[style.height]': 'sizePx()',
    '[style.border-radius]': '"50%"',
    '[style.background]': 'background()',
    '[style.box-shadow]': 'overlayValue("0 0 0 2px var(--color-surface, #fff)")',
    '[style.position]': 'overlayValue("absolute")',
    '[style.top]': 'cornerValue("top")',
    '[style.bottom]': 'cornerValue("bottom")',
    '[style.right]': 'cornerValue("right")',
    '[style.left]': 'cornerValue("left")',
  },
  template: '',
})
export class PresenceDot {
  /** The presence state to display. */
  status?: PresenceStatus
  /** Diameter in pixels. Defaults to 10. */
  size?: number
  /** Position — `'inline'` default; `'overlay'` positions absolutely. */
  position?: 'inline' | 'overlay'
  /** Overlay corner when `position="overlay"`. Defaults to `'bottom-right'`. */
  corner?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left'
  /** Accessible label override. Defaults to `Presence: <status>`. */
  ariaLabel?: string
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
   * Computes the dot's class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.className)
  }

  /**
   * The accessible label (React's `ariaLabel ?? \`Presence: ${status}\``).
   * @returns The label text.
   */
  label(): string {
    return this.ariaLabel ?? `Presence: ${this.status}`
  }

  /**
   * The dot's diameter (React's `size = 10` default parameter).
   * @returns The width/height, in pixels.
   */
  sizePx(): string {
    return `${this.size ?? 10}px`
  }

  /**
   * The dot's fill for the current status (React's `STATUS_COLOR[status]`;
   * an absent status clears the declaration rather than throwing).
   * @returns The hex color, or null when no status is bound.
   */
  background(): string | null {
    return this.status ? STATUS_COLOR[this.status] : null
  }

  /**
   * Whether the dot is positioned absolutely for an avatar overlay (React's
   * `position === 'overlay'`).
   * @returns True for the overlay position.
   */
  isOverlay(): boolean {
    return (this.position ?? 'inline') === 'overlay'
  }

  /**
   * One overlay-only declaration: its value when the dot is an overlay, or
   * null (removed) when it is inline.
   * @param value - The declaration's value for the overlay position.
   * @returns The value, or null.
   */
  overlayValue(value: string): string | null {
    return this.isOverlay() ? value : null
  }

  /**
   * One corner edge declaration (React's `corner.includes(edge)` checks).
   * @param edge - The edge to set when the corner includes it.
   * @returns `'0px'` when the edge applies, otherwise null.
   */
  cornerValue(edge: 'top' | 'bottom' | 'right' | 'left'): string | null {
    if (!this.isOverlay()) return null
    return (this.corner ?? 'bottom-right').includes(edge) ? '0px' : null
  }
}
