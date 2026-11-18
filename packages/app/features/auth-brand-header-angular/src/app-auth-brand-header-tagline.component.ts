/**
 * AuthBrandHeaderTagline component (React parity).
 *
 * @module
 */

import { Component } from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * The tagline `<p>`.
 *
 * The host IS the `<p>` (`p[mol-auth-brand-header-tagline]`), matching React's
 * root exactly; the content is projected.
 */
@Component({
  selector: 'p[mol-auth-brand-header-tagline]',
  standalone: true,
  inputs: ['className'],
  host: {
    '[class]': 'classes()',
  },
  template: '<ng-content></ng-content>',
})
export class AuthBrandHeaderTagline {
  /** Extra classes appended to the default tagline `<p>` chrome. */
  className?: string

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The tagline's class list.
   * @returns The class string.
   */
  classes(): string {
    const cm = this.cm()
    return cm.cn(
      cm.textSize('sm'),
      cm.fontWeight('medium'),
      cm.authBrandHeaderTagline,
      this.className,
    )
  }
}
