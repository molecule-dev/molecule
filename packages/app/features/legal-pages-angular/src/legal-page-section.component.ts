/**
 * LegalPageSection component (React parity): one sub-section of a legal page
 * (`h2` + body).
 *
 * @module
 */

import { Component } from '@angular/core'

import type { SpacingScale, UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * LegalPageSection component.
 *
 * One sub-section of a legal page (`h2` + body) styled for use inside
 * `LegalPageLayout`. The host IS the `<section>`
 * (`section[mol-legal-page-section]`), matching React's root exactly. The
 * heading is projected content (`[slot=title]`); the body is the element's
 * default content.
 */
@Component({
  selector: 'section[mol-legal-page-section]',
  standalone: true,
  inputs: ['title', 'stackGap'],
  host: { '[class]': 'classes()' },
  template: `<h2 [class]="titleClasses()"><ng-content select="[slot=title]"></ng-content></h2>
    <ng-content></ng-content>`,
})
export class LegalPageSection {
  /** Rendered heading text (projected `[slot=title]` content). */
  title?: unknown
  /** Stack gap between heading and body (defaults to 2 at read time). */
  stackGap?: SpacingScale

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The `<section>`'s class list (`cm.stack(stackGap)`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().stack(this.stackGap ?? 2)
  }

  /**
   * The heading's class list.
   * @returns The class string.
   */
  titleClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.textSize('xl'), cm.fontWeight('semibold'))
  }
}
