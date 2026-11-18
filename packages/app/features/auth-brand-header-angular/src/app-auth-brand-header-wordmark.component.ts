/**
 * AuthBrandHeaderWordmark component (React parity).
 *
 * @module
 */

import { Component } from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * The wordmark `<h1>`.
 *
 * The host IS the `<h1>` (`h1[mol-auth-brand-header-wordmark]`), matching
 * React's root exactly; the content is projected.
 */
@Component({
  selector: 'h1[mol-auth-brand-header-wordmark]',
  standalone: true,
  inputs: ['color', 'className'],
  host: {
    '[class]': 'classes()',
    '[style.color]': 'color || null',
  },
  template: '<ng-content></ng-content>',
})
export class AuthBrandHeaderWordmark {
  /** Inline color for the `<h1>`. */
  color?: string
  /** Extra classes appended to the default wordmark `<h1>` chrome. */
  className?: string

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The wordmark's class list (`className` appends last so an app override wins).
   * @returns The class string.
   */
  classes(): string {
    const cm = this.cm()
    return cm.cn(cm.textSize('4xl'), cm.authBrandHeaderWordmark, this.className)
  }
}
