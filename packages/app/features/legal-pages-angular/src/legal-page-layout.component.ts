/**
 * LegalPageLayout component (React parity): the canonical Terms / Privacy
 * layout shell.
 *
 * @module
 */

import { Component } from '@angular/core'

import type { SpacingScale, UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * LegalPageLayout component.
 *
 * `<main data-mol-id={...} class="container py-12">
 *    <h1>{title}</h1>
 *    <div class="prose stack">{children}</div>
 *  </main>`
 *
 * The host IS the `<main>` (`main[mol-legal-page-layout]`), matching React's
 * root exactly. The heading is projected content (`[slot=title]`); the body is
 * the element's default content.
 */
@Component({
  selector: 'main[mol-legal-page-layout]',
  standalone: true,
  inputs: ['dataMolId', 'title', 'containerSize', 'stackGap', 'mainClassName', 'bodyClassName'],
  host: {
    '[class]': 'mainClasses()',
    '[attr.data-mol-id]': 'dataMolId ?? null',
  },
  template: `<h1 [class]="titleClasses()"><ng-content select="[slot=title]"></ng-content></h1>
    <div [class]="bodyClasses()"><ng-content></ng-content></div>`,
})
export class LegalPageLayout {
  /** `data-mol-id` for AI agent selectors. */
  dataMolId?: string
  /** Rendered heading text (projected `[slot=title]` content). */
  title?: unknown
  /** ClassMap `container({size})` value (defaults to `'md'` at read time). */
  containerSize?: 'sm' | 'md' | 'lg' | 'xl'
  /** Stack gap between body children (defaults to 4 at read time). */
  stackGap?: SpacingScale
  /** Override the main wrapper's className (used by apps with custom chrome). */
  mainClassName?: string
  /** Override the body wrapper's className. */
  bodyClassName?: string

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The `<main>`'s class list (React's `mainClassName ?? cm.cn(container, py-12)`).
   * @returns The class string.
   */
  mainClasses(): string {
    const cm = this.cm()
    return (
      this.mainClassName ??
      cm.cn(cm.container({ size: this.containerSize ?? 'md' }), cm.sp('py', 12))
    )
  }

  /**
   * The heading's class list.
   * @returns The class string.
   */
  titleClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), cm.sp('mb', 6))
  }

  /**
   * The body wrapper's class list (React's `bodyClassName ?? cm.cn(prose, stack(stackGap))`).
   * @returns The class string.
   */
  bodyClasses(): string {
    const cm = this.cm()
    return this.bodyClassName ?? cm.cn(cm.prose, cm.stack(this.stackGap ?? 4))
  }
}
