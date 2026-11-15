/**
 * LeaderboardList component (React parity).
 *
 * @module
 */

import {
  type AfterViewInit,
  Component,
  type DoCheck,
  ElementRef,
  inject,
  Renderer2,
  ViewChild,
} from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { hasNodes, SlotGuard } from './slot-dom.js'

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
 * `childCount === 0 ? emptyState : <div>…`). The always-mounted capture
 * wrappers reconcile against that in {@link LeaderboardList.ngAfterViewInit}.
 */
@Component({
  selector: 'div[mol-leaderboard-list]',
  standalone: true,
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
export class LeaderboardList implements AfterViewInit, DoCheck {
  /** Extra classes on the outer wrapper. */
  className?: string

  /** The header capture wrapper (detached when neither title nor actions exist). */
  @ViewChild('header') header?: ElementRef<HTMLElement>
  /** The title's `<h3>` (detached when the title slot is empty). */
  @ViewChild('title') title?: ElementRef<HTMLElement>
  /** The actions capture wrapper (always detached; React renders the slot bare). */
  @ViewChild('actions') actions?: ElementRef<HTMLElement>
  /** The list container (detached when the default slot is empty). */
  @ViewChild('list') list?: ElementRef<HTMLElement>
  /** The emptyState capture wrapper (revealed bare, or hidden with the list rendered). */
  @ViewChild('empty') empty?: ElementRef<HTMLElement>

  private readonly guard = new SlotGuard(inject(ElementRef), inject(Renderer2))

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
   * Reads slot presence (view queries resolve only at view init) and
   * reconciles the wrappers against React's DOM.
   */
  ngAfterViewInit(): void {
    this.reconcile()
  }

  /**
   * Re-reconciles on later passes (a props step may change `className`; the
   * projected slots never change, so this settles immediately).
   */
  ngDoCheck(): void {
    this.reconcile()
  }

  /**
   * Applies React's conditions: the `<header>` renders when the title or the
   * actions exist (the `<h3>` only for a title, the actions bare); the list
   * container renders when the default slot has rows, otherwise the empty
   * state renders bare in its place.
   */
  private reconcile(): void {
    const title = this.title?.nativeElement
    const actions = this.actions?.nativeElement
    const list = this.list?.nativeElement
    const empty = this.empty?.nativeElement
    const hasTitle = hasNodes(title)
    const hasActions = hasNodes(actions)
    const hasChildren = hasNodes(list)

    this.guard.toggle(this.header?.nativeElement, hasTitle || hasActions)
    this.guard.toggle(title, hasTitle)
    this.guard.reveal(actions)
    this.guard.toggle(list, hasChildren)
    if (hasChildren) this.guard.hide(empty)
    else this.guard.reveal(empty)
  }
}
