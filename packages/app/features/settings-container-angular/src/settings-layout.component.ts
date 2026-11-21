/**
 * SettingsLayout component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component, type TemplateRef } from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { isTemplate } from './slots.js'

/**
 * Two-column settings-page scaffold.
 *
 * Sidebar on the left, content on the right, optional (non-sticky) header
 * above both. The host IS the outer `<div>` (`div[mol-settings-layout]`),
 * matching React's root exactly. Node props are projected content:
 * `[slot=header]` lands above the columns, `[slot=sidebar]` inside the
 * `<aside>`, and everything else in the main content column.
 */
@Component({
  selector: 'div[mol-settings-layout]',
  standalone: true,
  imports: [NgTemplateOutlet],
  inputs: ['header', 'className', 'dataMolId'],
  host: {
    '[class]': 'classes()',
    '[attr.data-mol-id]': 'dataMolId ?? null',
  },
  // prettier-ignore
  template: `<ng-content select="[slot=header]"></ng-content>@if (headerTemplate(); as headerTpl) {<ng-container [ngTemplateOutlet]="headerTpl" />}<div [class]="rowClasses()"><aside [class]="asideClasses()"><ng-content select="[slot=sidebar]"></ng-content></aside><main [class]="mainClasses()"><div [class]="contentClasses()"><ng-content></ng-content></div></main></div>`,
})
export class SettingsLayout {
  /** Optional header (breadcrumb, title, save button) — a template or projected `[slot=header]` content. */
  header?: unknown
  /** Extra classes on the outer wrapper. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The outer wrapper's class list (React's `cm.cn(cm.stack(4), className)`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().stack(4), this.className)
  }

  /**
   * The header as a template, when the caller passed a node rather than
   * projected content.
   * @returns The header template, or null.
   */
  headerTemplate(): TemplateRef<unknown> | null {
    return isTemplate(this.header) ? this.header : null
  }

  /**
   * The column row's class (`cm.flex({ align: 'start', gap: 'lg' })`).
   * @returns The class string.
   */
  rowClasses(): string {
    return this.cm().flex({ align: 'start', gap: 'lg' })
  }

  /**
   * The sidebar column's class (`cm.shrink0`).
   * @returns The class string.
   */
  asideClasses(): string {
    return this.cm().cn(this.cm().shrink0)
  }

  /**
   * The content column's class (`cm.flex1`).
   * @returns The class string.
   */
  mainClasses(): string {
    return this.cm().cn(this.cm().flex1)
  }

  /**
   * The content stack's class (`cm.stack(6)`).
   * @returns The class string.
   */
  contentClasses(): string {
    return this.cm().cn(this.cm().stack(6))
  }
}
