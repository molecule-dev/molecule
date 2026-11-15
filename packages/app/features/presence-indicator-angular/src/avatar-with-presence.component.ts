/**
 * AvatarWithPresence component (React parity).
 *
 * @module
 */

import { Component } from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { PresenceDot } from './presence-dot.component.js'
import type { PresenceStatus } from './types.js'

/**
 * AvatarWithPresence component.
 *
 * Wraps any avatar/image and overlays a presence dot at a corner.
 * Non-destructive — just positions the dot; the child is untouched. The host
 * IS the root `<span>` (`span[mol-avatar-with-presence]`), matching React's
 * root exactly. The avatar is projected content (the element's default
 * projection); the dot is rendered after it only while `status` is set, as
 * React renders it only when `status` is truthy. Same props, same DOM as
 * `@molecule/app-presence-indicator-react`'s `AvatarWithPresence`.
 */
@Component({
  selector: 'span[mol-avatar-with-presence]',
  standalone: true,
  imports: [PresenceDot],
  inputs: ['status', 'corner', 'dotSize', 'className'],
  host: {
    '[class]': 'classes()',
    '[style.display]': '"inline-block"',
  },
  template: `<ng-content></ng-content>
    @if (showDot()) {
      <span
        mol-presence-dot
        [status]="status"
        [position]="'overlay'"
        [corner]="cornerValue()"
        [size]="dotSize"
      ></span>
    }`,
})
export class AvatarWithPresence {
  /** Presence status; omit to hide the dot. */
  status?: PresenceStatus
  /** Corner placement of the dot. Defaults to `'bottom-right'`. */
  corner?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left'
  /** Dot size. Defaults to 10. */
  dotSize?: number
  /** Extra classes on the outer wrapper. */
  className?: string

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the wrapper's class list (React's `cm.position('relative')` plus
   * the caller's classes).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().position('relative'), this.className)
  }

  /**
   * Whether the dot renders: React's `{status && <PresenceDot />}` truthiness.
   * @returns True while a status is set.
   */
  showDot(): boolean {
    return Boolean(this.status)
  }

  /**
   * The dot's corner (React's `corner = 'bottom-right'` default parameter).
   * @returns The corner placement.
   */
  cornerValue(): 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left' {
    return this.corner ?? 'bottom-right'
  }
}
