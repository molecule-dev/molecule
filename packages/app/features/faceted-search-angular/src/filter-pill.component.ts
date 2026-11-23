/**
 * FilterPill component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  inject,
  type OnDestroy,
  signal,
  type TemplateRef,
  ViewChild,
} from '@angular/core'

import {
  MolPlacement,
  setElementPresent,
  type SlotReader,
  usePlacement,
} from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { isTemplate, textOf } from './slot-dom.js'

/**
 * FilterPill component.
 *
 * Outlined filter pill with an optional `expand_more` chevron and a dropdown
 * panel that opens beneath it. The host IS the React root `<div>`
 * (`div[mol-faceted-search-filter-pill]`), carrying React's `position:
 * relative` class. The pill is the trigger; the panel content arrives as the
 * element's default projection and the label as text, a `TemplateRef`, or
 * `[slot=label]` content. React renders the panel `<div>` only while it is
 * open, so the always-mounted projection wrapper is detached and restored to
 * match.
 */
@Component({
  selector: 'div[mol-faceted-search-filter-pill]',
  standalone: true,
  hostDirectives: [MolPlacement],
  imports: [NgTemplateOutlet],
  inputs: ['label', 'active', 'hideChevron', 'leadingIcon', 'panelAlign', 'dataMolId'],
  host: {
    '[class]': 'classes()',
  },
  // Icon-font ligature names are decoration (aria-hidden): the pill's own label
  // names the filter, so screen readers must not read the glyphs out.
  // prettier-ignore
  template: `<button type="button" aria-haspopup="true" [attr.aria-expanded]="isOpen() ? 'true' : 'false'" [attr.data-mol-id]="dataMolId ?? null" (click)="toggle()" [attr.data-state]="active || isOpen() ? 'active' : 'inactive'" [class]="triggerClasses()"><span [class]="innerClasses()">@if (leadingIcon) {<span aria-hidden="true" [class]="iconClasses()">{{ leadingIcon }}</span>}<ng-content select="[slot=label]"></ng-content>@if (labelTemplate(); as labelTpl) {<ng-container [ngTemplateOutlet]="labelTpl"></ng-container>}@if (labelText()) {{{ labelText() }}}@if (!hideChevron) {<span aria-hidden="true" [class]="iconClasses()">expand_more</span>}</span></button><div #panelWrap [class]="panelClasses()"><ng-content></ng-content></div>`,
})
export class FilterPill implements OnDestroy {
  /** Pill label: text, a template ref, or projected `[slot=label]` content. */
  label?: string | TemplateRef<unknown>
  /** Highlight pill when a filter value is applied. */
  active?: boolean
  /** Hide chevron (e.g. "More filters" pill uses a tune icon instead). */
  hideChevron?: boolean
  /** Leading icon (material-symbols name). */
  leadingIcon?: string
  /** Panel position relative to the trigger (defaults to `'left'` at read time). */
  panelAlign?: 'left' | 'right'
  /** `data-mol-id` for AI-agent selectors, on the trigger button. */
  dataMolId?: string

  /** The panel `<div>` (detached while closed, as React renders it conditionally). */
  @ViewChild('panelWrap') private panelWrap?: ElementRef<HTMLElement>

  /** Whether the panel is open (React's `useState(false)`). */
  private readonly open = signal(false)
  /** Whether the document mousedown listener is currently attached. */
  private listening = false

  /** The host element (the React root `<div>`). */
  private readonly host = inject(ElementRef<HTMLElement>)
  /**
   * The component's change detector. React re-renders from the outside-click
   * listener; a zoneless Angular view only refreshes when it is marked, and a
   * manually added document listener marks nothing on its own.
   */
  private readonly cdr = inject(ChangeDetectorRef)

  constructor() {
    usePlacement((hasContent) => this.reconcile(hasContent))
  }

  /**
   * Removes the outside-mousedown listener.
   */
  ngOnDestroy(): void {
    this.detachListener()
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the wrapper's class list (React's `cn(position('relative'))`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().position('relative'))
  }

  /**
   * Computes the trigger's class list, exactly as React composes it.
   * @returns The class string.
   */
  triggerClasses(): string {
    return this.cm().cn(
      this.cm().tabsTrigger({ variant: 'soft-rounded', size: 'sm' }),
      this.cm().fontWeight('medium'),
      this.cm().touchTargetCompact,
    )
  }

  /**
   * Computes the trigger's inner row class (React's `flex({ align: 'center', gap: 'sm' })`).
   * @returns The class string.
   */
  innerClasses(): string {
    return this.cm().flex({ align: 'center', gap: 'sm' })
  }

  /**
   * Computes a glyph span's class list (the leading icon and the chevron).
   * @returns The class string.
   */
  iconClasses(): string {
    return this.cm().cn(this.cm().textSize('sm'), this.cm().iconGlyphFont)
  }

  /**
   * Computes the panel's class list (React's left/right branch).
   * @returns The class string.
   */
  panelClasses(): string {
    return this.cm().cn(
      this.cm().sp('mt', 2),
      this.cm().sp('p', 4),
      this.cm().facetedSearchPillPanel,
      (this.panelAlign ?? 'left') === 'right'
        ? this.cm().facetedSearchPillPanelRight
        : this.cm().facetedSearchPillPanelLeft,
    )
  }

  /**
   * Whether the panel is open.
   * @returns The open state.
   */
  isOpen(): boolean {
    return this.open()
  }

  /**
   * Toggles the panel, attaching or removing React's outside-mousedown listener
   * with it.
   */
  toggle(): void {
    this.open.update((value) => !value)
    if (this.open()) this.attachListener()
    else this.detachListener()
    this.cdr.markForCheck()
  }

  /**
   * The label as a template, when the caller passed one.
   * @returns The label template, or null.
   */
  labelTemplate(): TemplateRef<unknown> | null {
    return isTemplate(this.label) ? this.label : null
  }

  /**
   * The label input's text (React renders strings and numbers; a projected
   * label is not repeated as text).
   * @returns The text, or `''`.
   */
  labelText(): string {
    if (this.label === undefined || this.label === null || isTemplate(this.label)) return ''
    return textOf(this.label)
  }

  /**
   * Applies React's condition for the panel: it renders only while open and
   * only when there is content.
   *
   * @param hasContent - Reads whether a slot has content.
   */
  private reconcile(hasContent: SlotReader): void {
    const panel = this.panelWrap?.nativeElement
    if (!panel) return
    setElementPresent(panel, this.open() && hasContent(panel))
  }

  /**
   * Closes the panel when a mousedown occurs outside the host element (React's
   * outside-click effect, which only exists while the panel is open).
   * @param event - The document mousedown.
   */
  private readonly onDoc = (event: MouseEvent): void => {
    if (!this.open()) return
    if (this.host.nativeElement.contains(event.target as Node)) return
    this.open.set(false)
    this.detachListener()
    this.cdr.markForCheck()
  }

  /** Attaches the document mousedown listener once. */
  private attachListener(): void {
    if (this.listening) return
    document.addEventListener('mousedown', this.onDoc)
    this.listening = true
  }

  /** Removes the document mousedown listener. */
  private detachListener(): void {
    if (!this.listening) return
    document.removeEventListener('mousedown', this.onDoc)
    this.listening = false
  }
}
