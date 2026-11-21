/**
 * PresenceDot component (React parity).
 *
 * @module
 */

import { Component } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { PresenceStatus } from './types.js'

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
 * The default aria-label resolves through `t()` with the
 * `presenceIndicator.aria.presence` key (an explicitly translated status word
 * per `presenceIndicator.status.*` key), so it follows the active locale;
 * `ariaLabel` overrides it.
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
    '[style.box-shadow]': 'overlayValue("0 0 0 2px var(--color-surface)")',
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
  /** Accessible label override; defaults to `t('presenceIndicator.aria.presence', …)`. */
  ariaLabel?: string
  /** Extra classes. */
  className?: string

  /** The i18n provider access (locale-reactive through the notifications signal). */
  private readonly i18n = useTranslation()

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
    return this.cm().cn(this.statusClass(), this.className)
  }

  /**
   * The class that fills the dot for the current status (React's tone
   * mapping): the theme's solid success/warning/error tone for
   * online/away/busy, the theme's neutral border grey for offline — never a
   * hardcoded hex. An absent status adds no class, matching React's missing
   * background declaration.
   * @returns The tone class, or null when no status is bound.
   */
  statusClass(): string | null {
    const cm = this.cm()
    switch (this.status) {
      case 'online':
        return cm.progressColor('success')
      case 'away':
        return cm.progressColor('warning')
      case 'busy':
        return cm.progressColor('error')
      case 'offline':
        return cm.bgBorder
      default:
        return null
    }
  }

  /**
   * The translated word for one presence state (React's `statusLabel`): one
   * literal `t()` call per value of {@link PresenceStatus}, so molecule's i18n
   * gate sees each key exist. Every `presenceIndicator.status.*` key ships in
   * the `@molecule/app-locales-presence-indicator` bond. An absent status keeps
   * React's `Presence: undefined` shape for the label built from it.
   * @returns The status's word in the active locale.
   */
  statusLabel(): string {
    const t = this.i18n.t
    switch (this.status) {
      case 'online':
        return t('presenceIndicator.status.online', undefined, { defaultValue: 'online' })
      case 'away':
        return t('presenceIndicator.status.away', undefined, { defaultValue: 'away' })
      case 'busy':
        return t('presenceIndicator.status.busy', undefined, { defaultValue: 'busy' })
      case 'offline':
        return t('presenceIndicator.status.offline', undefined, { defaultValue: 'offline' })
      default:
        return `${this.status}`
    }
  }

  /**
   * The accessible label (React's
   * `ariaLabel ?? t('presenceIndicator.aria.presence', …)`).
   * @returns The label text.
   */
  label(): string {
    return (
      this.ariaLabel ??
      this.i18n.t(
        'presenceIndicator.aria.presence',
        { status: this.statusLabel() },
        { defaultValue: 'Presence: {{status}}' },
      )
    )
  }

  /**
   * The dot's diameter (React's `size = 10` default parameter).
   * @returns The width/height, in pixels.
   */
  sizePx(): string {
    return `${this.size ?? 10}px`
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
