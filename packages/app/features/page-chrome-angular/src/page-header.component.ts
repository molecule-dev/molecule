/**
 * PageHeader component (React parity).
 *
 * @module
 */

import { Component, type ElementRef, ViewChild } from '@angular/core'

import {
  MolPlacement,
  setElementPresent,
  type SlotReader,
  usePlacement,
} from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * PageHeader component.
 *
 * Standard page-top header with optional breadcrumbs, leading icon,
 * title / subtitle pair, meta row, and right-aligned actions. The host IS the
 * outer `<header>` (`header[mol-page-header]`), matching React's root exactly.
 * Layout: breadcrumbs, then a two-column row with title+subtitle on the left
 * and actions on the right, then optional meta.
 *
 * Node props are projected content: `breadcrumbs` is `[slot=breadcrumbs]`,
 * `icon` `[slot=icon]`, `title` `[slot=title]`, `subtitle` `[slot=subtitle]`,
 * `actions` `[slot=actions]` and `meta` `[slot=meta]`. React omits the
 * subtitle paragraph, the action row and the meta row when their node is
 * absent, so those wrappers are removed while their projection is empty and
 * restored in place when content is projected again.
 */
@Component({
  selector: 'header[mol-page-header]',
  standalone: true,
  hostDirectives: [MolPlacement],
  inputs: ['emphasis', 'className', 'dataMolId'],
  host: {
    '[class]': 'classes()',
    '[attr.data-mol-id]': 'dataMolId ?? null',
  },
  template: `<ng-content select="[slot=breadcrumbs]"></ng-content>
    <div [class]="rowClasses()">
      <div [class]="leftClasses()">
        <ng-content select="[slot=icon]"></ng-content>
        <div [class]="stackClasses()">
          <h1 [class]="titleClasses()"><ng-content select="[slot=title]"></ng-content></h1>
          <p #subtitleEl [class]="subtitleClasses()">
            <ng-content select="[slot=subtitle]"></ng-content>
          </p>
        </div>
      </div>
      <div #actionsEl [class]="leftClasses()">
        <ng-content select="[slot=actions]"></ng-content>
      </div>
    </div>
    <div #metaEl [class]="metaClasses()"><ng-content select="[slot=meta]"></ng-content></div>`,
})
export class PageHeader {
  /** Title emphasis level (`'normal'` by default at read time). */
  emphasis?: 'normal' | 'extrabold'
  /** Extra classes on the outer wrapper. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string

  /** The subtitle paragraph (React renders it only while a subtitle exists). */
  @ViewChild('subtitleEl') subtitleEl?: ElementRef<HTMLElement>
  /** The action row (React renders it only while an action exists). */
  @ViewChild('actionsEl') actionsEl?: ElementRef<HTMLElement>
  /** The meta row (React renders it only while meta exists). */
  @ViewChild('metaEl') metaEl?: ElementRef<HTMLElement>

  constructor() {
    usePlacement((hasContent) => this.sync(hasContent))
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the wrapper class list (`cm.stack(3)` plus `className`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().stack(3), this.className)
  }

  /**
   * The title row's class (`cm.flex({ justify: 'between', align: 'start', gap: 'md' })`).
   * @returns The class string.
   */
  rowClasses(): string {
    return this.cm().flex({ justify: 'between', align: 'start', gap: 'md' })
  }

  /**
   * The icon + title column's class (`cm.flex({ align: 'center', gap: 'sm' })`).
   * @returns The class string.
   */
  leftClasses(): string {
    return this.cm().flex({ align: 'center', gap: 'sm' })
  }

  /**
   * The title/subtitle stack's class (`cm.stack(1)`).
   * @returns The class string.
   */
  stackClasses(): string {
    return this.cm().stack(1)
  }

  /**
   * The title's class: 4xl extrabold for `emphasis="extrabold"`, else 3xl bold.
   * @returns The class string.
   */
  titleClasses(): string {
    return this.cm().cn(
      this.cm().textSize(this.emphasis === 'extrabold' ? '4xl' : '3xl'),
      this.cm().fontWeight(this.emphasis === 'extrabold' ? 'extrabold' : 'bold'),
    )
  }

  /**
   * The subtitle paragraph's class (`cm.textSize('base')`).
   * @returns The class string.
   */
  subtitleClasses(): string {
    return this.cm().textSize('base')
  }

  /**
   * The meta row's class (`cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })`).
   * @returns The class string.
   */
  metaClasses(): string {
    return this.cm().flex({ align: 'center', gap: 'sm', wrap: 'wrap' })
  }

  /**
   * Withholds the optional regions React omits, and restores the ones with
   * content.
   *
   * @param hasContent - Reads whether a slot has content.
   */
  private sync(hasContent: SlotReader): void {
    const subtitle = this.subtitleEl?.nativeElement
    setElementPresent(subtitle, hasContent(subtitle))
    const actions = this.actionsEl?.nativeElement
    setElementPresent(actions, hasContent(actions))
    const meta = this.metaEl?.nativeElement
    setElementPresent(meta, hasContent(meta))
  }
}
