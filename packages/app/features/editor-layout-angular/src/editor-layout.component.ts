/**
 * EditorLayout component (React parity).
 *
 * @module
 */

import {
  type AfterViewInit,
  Component,
  type DoCheck,
  type ElementRef,
  ViewChild,
} from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * Whether an ng-content capture point received any element or text node.
 *
 * @param el - The capture element.
 * @returns True when at least one rendered node exists.
 */
const hasNodes = (el: Element | undefined | null): boolean => {
  if (!el) return false
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === Node.ELEMENT_NODE) return true
    if (node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim()) return true
  }
  return false
}

/**
 * EditorLayout component.
 *
 * Three-region editor scaffold: sticky top bar + main canvas + optional side
 * panel. The host IS the outer `<div>` (`div[mol-editor-layout]`), matching
 * React's root exactly. The top bar, canvas and side panel are projected
 * slots (`[slot=topBar]`, `[slot=canvas]`, `[slot=sidePanel]`); the side
 * panel renders before the `<main>` on the left and after it on the right.
 *
 * Angular projection needs always-mounted `<ng-content>` capture points, so
 * both side-panel wrappers live in the template unconditionally and
 * {@link EditorLayout.ngDoCheck} reconciles them against React's DOM.
 */
@Component({
  selector: 'div[mol-editor-layout]',
  standalone: true,
  imports: [],
  inputs: ['sidePanelPosition', 'sidePanelOpen', 'className', 'dataMolId'],
  host: {
    '[class]': 'classes()',
    '[attr.data-mol-id]': 'dataMolId ?? null',
  },
  template: `<div #bar [style.position]="'sticky'" [style.top]="'0px'" [style.z-index]="'10'">
      <ng-content select="[slot=topBar]"></ng-content>
    </div>
    <div #body [class]="rowClasses()">
      <aside #leftPanel [class]="panelClasses()">
        <ng-content select="[slot=sidePanel]"></ng-content>
      </aside>
      <main #canvas [class]="canvasClasses()">
        <ng-content select="[slot=canvas]"></ng-content>
      </main>
      <aside #rightPanel [class]="panelClasses()">
        <ng-content select="[slot=sidePanel]"></ng-content>
      </aside>
    </div>`,
})
export class EditorLayout implements AfterViewInit, DoCheck {
  /** Side-panel position (defaults to `'right'` at read time). */
  sidePanelPosition?: 'left' | 'right'
  /** Whether the side panel is currently visible (defaults to `true`). */
  sidePanelOpen?: boolean
  /** Extra classes. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string

  /** The sticky top-bar container. */
  @ViewChild('bar') bar?: ElementRef<HTMLElement>
  /** The panel/canvas row. */
  @ViewChild('body') body?: ElementRef<HTMLElement>
  /** The left side-panel capture wrapper (before the `<main>`). */
  @ViewChild('leftPanel') leftPanel?: ElementRef<HTMLElement>
  /** The canvas. */
  @ViewChild('canvas') canvas?: ElementRef<HTMLElement>
  /** The right side-panel capture wrapper (after the `<main>`). */
  @ViewChild('rightPanel') rightPanel?: ElementRef<HTMLElement>

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the wrapper class list (`cm.flex({ direction: 'col' })` +
   * `cm.h('screen')` + `className`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().flex({ direction: 'col' }), this.cm().h('screen'), this.className)
  }

  /**
   * Computes the panel/canvas row class (`cm.flex({ align: 'stretch' })` + `cm.flex1`).
   * @returns The class string.
   */
  rowClasses(): string {
    return this.cm().cn(this.cm().flex({ align: 'stretch' }), this.cm().flex1)
  }

  /**
   * Computes the side-panel class (`cm.shrink0`).
   * @returns The class string.
   */
  panelClasses(): string {
    return this.cm().cn(this.cm().shrink0)
  }

  /**
   * Computes the canvas class (`cm.flex1`).
   * @returns The class string.
   */
  canvasClasses(): string {
    return this.cm().cn(this.cm().flex1)
  }

  /**
   * Reads slot presence (view queries resolve only at view init) and
   * reconciles the side-panel wrappers against React's DOM.
   */
  ngAfterViewInit(): void {
    this.reconcile()
  }

  /**
   * Re-reconciles on later passes (a props step may move the panel or toggle
   * its visibility; the projected slots never change).
   */
  ngDoCheck(): void {
    this.reconcile()
  }

  /**
   * Applies React's conditions: with a projected side panel and
   * `sidePanelOpen` (default true), exactly one `<aside class="shrink0">`
   * wraps it — before the `<main>` on the left, after it on the right;
   * otherwise no `<aside>` renders.
   */
  private reconcile(): void {
    const body = this.body?.nativeElement
    const left = this.leftPanel?.nativeElement
    const right = this.rightPanel?.nativeElement
    const main = this.canvas?.nativeElement
    if (!body || !left || !right || !main) return
    const hasPanel = hasNodes(left) || hasNodes(right)
    const showPanel = hasPanel && (this.sidePanelOpen ?? true)
    const target = this.sidePanelPosition === 'left' ? left : right
    const other = target === left ? right : left
    // The nodes sit in whichever capture point last held them; move them
    // into the target before attaching it.
    const source = hasNodes(right) ? right : left
    for (const node of Array.from(source.childNodes)) target.appendChild(node)
    if (showPanel) {
      if (!target.isConnected) body.insertBefore(target, target === left ? main : null)
    } else if (target.isConnected) {
      body.removeChild(target)
    }
    if (other.isConnected) body.removeChild(other)
  }
}
