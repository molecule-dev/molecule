/**
 * LeaderboardList component (React parity).
 *
 * @module
 */

import { Component, ElementRef, inject, ViewChild } from '@angular/core'

import {
  MolPlacement,
  placeContent,
  setElementPresent,
  type SlotReader,
  usePlacement,
} from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * LeaderboardList component.
 *
 * Container above a stack of rows — header + actions + the list. The host IS
 * the outer `<div>` (`div[mol-leaderboard-list]`), matching React's root
 * exactly. Doesn't itself render rank logic; pair with a row component
 * (`@molecule/app-leaderboard-row-react` in React apps; your own rows
 * otherwise).
 *
 * The node props are projected slots: `title` renders inside the `<h3>`,
 * `actions` bare beside it, `children` inside the list container, and
 * `emptyState` bare in place of the list (React's
 * `childCount === 0 ? emptyState : <div>…`). The optional wrappers are taken
 * out of the DOM when React renders nothing ({@link setElementPresent}) and the
 * bare slots' content is moved to where React renders it ({@link placeContent}),
 * in {@link LeaderboardList.reconcile}.
 */
@Component({
  selector: 'div[mol-leaderboard-list]',
  standalone: true,
  hostDirectives: [MolPlacement],
  inputs: ['className'],
  host: {
    '[class]': 'classes()',
  },
  template: `<header #header [class]="headerClasses()">
      <h3 #title [class]="titleClasses()"><ng-content select="[slot=title]"></ng-content></h3>
      <span #actions><ng-content select="[slot=actions]"></ng-content></span>
    </header>
    <div #list [class]="listClasses()"><ng-content></ng-content></div>
    <span #empty><ng-content select="[slot=emptyState]"></ng-content></span>`,
})
export class LeaderboardList {
  /** Extra classes on the outer wrapper. */
  className?: string

  /** The header capture wrapper (absent when neither title nor actions exist). */
  @ViewChild('header') header?: ElementRef<HTMLElement>
  /** The title's `<h3>` (absent when the title slot is empty). */
  @ViewChild('title') title?: ElementRef<HTMLElement>
  /** The actions capture wrapper (always absent; React renders the slot bare). */
  @ViewChild('actions') actions?: ElementRef<HTMLElement>
  /** The list container (absent when the default slot is empty). */
  @ViewChild('list') list?: ElementRef<HTMLElement>
  /** The emptyState capture wrapper (rendered bare, or absent with the list rendered). */
  @ViewChild('empty') empty?: ElementRef<HTMLElement>

  /** The component host, the parent the bare `emptyState` renders in. */
  private readonly host = inject(ElementRef<HTMLElement>)

  constructor() {
    usePlacement((hasContent) => this.reconcile(hasContent))
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the wrapper class list (`cm.stack(2)` + `className`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().stack(2), this.className)
  }

  /**
   * Computes the header class (`cm.flex({ align: 'center', justify: 'between', gap: 'sm' })`).
   * @returns The class string.
   */
  headerClasses(): string {
    return this.cm().flex({ align: 'center', justify: 'between', gap: 'sm' })
  }

  /**
   * Computes the title class (`cm.textSize('sm')` + `cm.fontWeight('semibold')`).
   * @returns The class string.
   */
  titleClasses(): string {
    return this.cm().cn(this.cm().textSize('sm'), this.cm().fontWeight('semibold'))
  }

  /**
   * Computes the list container class (`cm.stack(1)`).
   * @returns The class string.
   */
  listClasses(): string {
    return this.cm().stack(1)
  }

  /**
   * Applies React's conditions: the `<header>` renders when the title or the
   * actions exist (the `<h3>` only for a title, the actions bare); the list
   * container renders when the default slot has rows, otherwise the empty
   * state renders bare in its place.
   *
   * @param hasContent - Reads whether a slot has content.
   */
  private reconcile(hasContent: SlotReader): void {
    const header = this.header?.nativeElement
    const title = this.title?.nativeElement
    const actions = this.actions?.nativeElement
    const list = this.list?.nativeElement
    const empty = this.empty?.nativeElement
    const hasTitle = hasContent(title)
    const hasActions = hasContent(actions)
    const hasChildren = hasContent(list)

    setElementPresent(header, hasTitle || hasActions)
    setElementPresent(title, hasTitle)
    // React renders `actions` bare inside the header: the projected content
    // sits where the capture wrapper is, and the wrapper itself renders nothing.
    if (actions && header) {
      placeContent(actions, header, actions)
      setElementPresent(actions, false)
    }
    setElementPresent(list, hasChildren)
    // React renders `emptyState` bare in place of the list.
    if (empty) {
      if (hasChildren) {
        placeContent(empty, null)
        setElementPresent(empty, false)
      } else {
        placeContent(empty, this.host.nativeElement, empty)
        setElementPresent(empty, false)
      }
    }
  }
}
