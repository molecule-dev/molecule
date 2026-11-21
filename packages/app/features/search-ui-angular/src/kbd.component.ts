/**
 * Kbd component (React parity).
 *
 * @module
 */

import { Component } from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * Kbd component.
 *
 * A key cap, for shortcut hints (`/` to focus, `↵` to open). The host IS the
 * `<kbd>` React renders (`kbd[mol-kbd]`), and the key label is the projected
 * content — the same children React's `Kbd` carries. The cap shows a key name,
 * not prose (a physical key such as `esc` reads the same in every language), so
 * the host carries HTML's own `translate="no"`.
 */
@Component({
  selector: 'kbd[mol-kbd]',
  standalone: true,
  inputs: ['className'],
  host: {
    '[class]': 'classes()',
    translate: 'no',
  },
  template: `<ng-content></ng-content>`,
})
export class Kbd {
  /** Extra classes composed onto the cap. */
  className?: string

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The cap's class list (`cm.kbd` + `className`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().kbd, this.className)
  }
}
