/**
 * TimelineDate component (React parity).
 *
 * @module
 */

import { Component } from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * TimelineDate component.
 *
 * Date separator rendered between timeline groups. The host IS the
 * separator's outer `<div>` (`div[mol-timeline-date]`), matching React's root
 * exactly, and the label is projected content (the default `<ng-content>`).
 *
 * This is the Angular counterpart of `@molecule/app-timeline-react`'s
 * `TimelineDate`: the same props (React names), the same ClassMap tokens, and
 * the same DOM for the same input.
 */
@Component({
  selector: 'div[mol-timeline-date]',
  standalone: true,
  inputs: ['className'],
  host: {
    '[class]': 'classes()',
  },
  template: `<span [class]="cm().cn(cm().flex1)"><ng-content></ng-content></span>`,
})
export class TimelineDate {
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
   * Computes the separator's class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(
      this.cm().flex({ align: 'center', gap: 'sm' }),
      this.cm().sp('py', 2),
      this.cm().textSize('xs'),
      this.cm().fontWeight('semibold'),
      this.className,
    )
  }
}
