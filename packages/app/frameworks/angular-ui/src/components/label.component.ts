/**
 * Label component (React parity).
 *
 * @module
 */

import { Component } from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * Label component.
 *
 * A `<label>` with the class map's label styles; `required` switches to the
 * required variant and `htmlFor` renders the `for` attribute.
 */
@Component({
  selector: 'label[mol-label]',
  standalone: true,
  inputs: ['required', 'className', 'htmlFor'],
  host: {
    '[class]': 'classes()',
    '[attr.for]': 'htmlFor',
  },
  template: `<ng-content></ng-content>`,
})
export class Label {
  /** Whether the label renders its required marker. */
  required?: boolean
  /** Extra classes. */
  className?: string
  /** The associated control's id (`for` attribute). */
  htmlFor?: string

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the label class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().label({ required: !!this.required }), this.className)
  }
}
