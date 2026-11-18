/**
 * ActivityTimelineDot component (React parity).
 *
 * @module
 */

import { Component } from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { TimelineKindTone } from './types.js'

/**
 * ActivityTimelineDot component.
 *
 * A single dot + icon marker. The host IS the dot's `<div>`
 * (`div[mol-activity-timeline-dot]`), matching React's root exactly. A
 * consumer-supplied `dotClass`/`iconClass` wins; the package defaults use theme
 * tokens (subtle primary fill + primary icon) that read correctly in both light
 * and dark — never a light-only literal.
 */
@Component({
  selector: 'div[mol-activity-timeline-dot]',
  standalone: true,
  inputs: ['tone', 'className'],
  host: {
    '[class]': 'classes()',
    '[style.left]': "'0px'",
    '[style.top]': "'0px'",
  },
  template: `<span [class]="iconClasses()">{{ icon() }}</span>`,
})
export class ActivityTimelineDot {
  /** Visual treatment for the event's kind. */
  tone!: TimelineKindTone
  /** Extra classes on the dot. */
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
    const cm = this.cm()
    return cm.cn(
      cm.flex({ align: 'center', justify: 'center' }),
      cm.w(6),
      cm.h(6),
      cm.position('absolute'),
      cm.roundedFull,
      this.tone?.dotClass ?? cm.bgPrimarySubtle,
      this.tone?.iconClass ?? cm.textPrimary,
      this.className,
    )
  }

  /**
   * Computes the icon span's class list.
   * @returns The class string.
   */
  iconClasses(): string {
    return this.cm().cn(this.cm().textSize('xs'), this.cm().iconGlyphFont)
  }

  /**
   * The icon name the span shows.
   * @returns The Material Symbols icon name.
   */
  icon(): string {
    return this.tone?.icon ?? ''
  }
}
