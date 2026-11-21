/**
 * SettingsContent component (React parity).
 *
 * @module
 */

import { Component } from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * Wrapper for the right-hand column of the settings layout.
 *
 * Just a vertically-stacked container for one or more settings sections —
 * useful as a semantic landmark and for consistent spacing. The host IS the
 * `<div>` React renders (`div[mol-settings-content]`); its content is
 * projected default content.
 */
@Component({
  selector: 'div[mol-settings-content]',
  standalone: true,
  inputs: ['className'],
  host: {
    '[class]': 'classes()',
  },
  template: `<ng-content></ng-content>`,
})
export class SettingsContent {
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
   * The wrapper's class list (React's `cm.cn(cm.stack(6), className)`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().stack(6), this.className)
  }
}
