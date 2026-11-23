/**
 * Reusable quick picker overlay — used by Quick Open and the Command Palette.
 *
 * Angular counterpart of `@molecule/app-ide-react`'s `QuickPicker` (see that
 * file for the design notes): the same inputs (React prop names), the same DOM
 * for the same input, the same callbacks. A filterable, keyboard-navigable
 * list rendered at the top-center of the viewport, above a click-away
 * backdrop; rows are ordered by a fuzzy score of the query, the highlighted
 * row follows the arrow keys and the pointer, and Enter selects it.
 *
 * React's component is a fragment of TWO roots (the backdrop and the panel),
 * so the host is an empty, layout-neutral element (`display: contents`) whose
 * content is adopted beside it every change-detection pass (`ngDoCheck`, the
 * kit's own session-gate convention) — the template then renders exactly
 * React's tree, and the host never appears in a `@focus` path. Inputs are
 * declared the way the kit's other Angular
 * feature components declare them — one plain field per React prop, named in
 * the decorator's `inputs` array — and every derived value is a method the
 * template reads, so each change-detection pass renders the current state the
 * way React's render does. Styling uses `getClassMap()` (`cm.*`) and the only
 * inline styles are layout the ClassMap can't express, serialized through
 * `styleText` the way React writes numbers (`500` → `500px`). All user-facing
 * text goes through `t()`.
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import {
  afterNextRender,
  Component,
  type DoCheck,
  ElementRef,
  inject,
  type OnChanges,
  type OnInit,
  type SimpleChanges,
  TemplateRef,
  ViewChild,
} from '@angular/core'

import { useThemeMode, useTranslation } from '@molecule/app-angular'
import { fuzzyScore } from '@molecule/app-ide-panel-logic/panels'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { styleText } from '@molecule/app-ui-angular'

import { useCoarsePointer, useNarrowViewport } from '../hooks/useViewport.js'

/** An item in the quick picker list. */
export interface QuickPickerItem {
  /** Unique identifier. */
  id: string
  /** Primary label. */
  label: string
  /** Secondary text shown beside the label. */
  detail?: string
  /** Optional icon node (an `ng-template` reference, or plain text). */
  icon?: string | number | TemplateRef<unknown>
}

/**
 * Properties for the reusable quick picker overlay — React's contract, the
 * React prop names.
 */
export interface QuickPickerProps {
  /** Items to display and filter. */
  items: QuickPickerItem[]
  /** Placeholder text for the search input. */
  placeholder?: string
  /** Called when the user selects an item. */
  onSelect: (item: QuickPickerItem) => void
  /** Called when the user dismisses the picker (Escape or backdrop click). */
  onDismiss: () => void
  /** Show a loading indicator. */
  loading?: boolean
  /** Pre-fill the search input. */
  initialQuery?: string
  className?: string
}

/**
 * The picker's inline-style texts that never change, serialized once with
 * `styleText` (React's camelCase numbers become `px` exactly the way React
 * writes them; the conformance normalizer sorts declarations, so key order is
 * free).
 */
const STYLES = {
  /** The full-viewport click-away tint behind the picker (the colour text React's DOM carries). */
  backdrop: styleText({
    position: 'fixed',
    inset: 0,
    zIndex: 1000,
    background: 'rgba(0, 0, 0, 0.4)',
  }),
  /** The loading and no-results rows. */
  stateRow: styleText({
    padding: '12px',
    fontSize: 12,
    color: 'var(--mol-color-text-secondary, #888)',
    textAlign: 'center',
  }),
  /** A row's label span, truncating rather than pushing the detail out. */
  label: styleText({
    flex: '1 1 0%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  }),
  /** A row's detail span. */
  detail: styleText({
    fontSize: 11,
    color: 'var(--mol-color-text-secondary, #888)',
    flexShrink: 0,
  }),
} as const

/**
 * Quick picker overlay with keyboard navigation.
 */
@Component({
  selector: 'div[mol-quick-picker]',
  standalone: true,
  imports: [NgTemplateOutlet],
  inputs: ['items', 'placeholder', 'onSelect', 'onDismiss', 'loading', 'initialQuery', 'className'],
  host: {
    'data-parity-unwrap': '',
    style: 'display: contents',
  },
  // prettier-ignore
  template: `<div role="presentation" [attr.style]="s.backdrop" (click)="dismissBackdrop($event)"></div><div role="dialog" aria-modal="true" [attr.aria-label]="t('ide.quickPicker.label', undefined, { defaultValue: 'Quick picker' })" [class]="cm.cn(className)" [attr.style]="panelStyle()"><input #input type="text" [value]="query" [attr.value]="query" (input)="onSearch($event)" (keydown)="handleKeyDown($event)" [attr.placeholder]="placeholderText()" [attr.style]="inputStyle()" /><div #list [attr.style]="listStyle()">@if (loading) {<div [attr.style]="s.stateRow">{{ t('ide.quickPicker.loading', undefined, { defaultValue: 'Loading…' }) }}</div>} @else if (filtered().length === 0) {<div [attr.style]="s.stateRow">{{ t('ide.quickPicker.noResults', undefined, { defaultValue: 'No matching results' }) }}</div>} @else {@for (item of filtered(); track item.id; let i = $index) {<button type="button" [attr.data-mol-id]="'quick-picker-item-' + item.id" (click)="pick(item)" (keydown)="handleKeyDown($event)" (mouseenter)="highlight(i)" [class]="cm.touchTargetCompact" [attr.style]="rowStyle(item, i)">@if (item.icon != null) {@if (isTemplate(item.icon)) {<ng-container [ngTemplateOutlet]="templateOf(item.icon)"></ng-container>}@else {{{ textOf(item.icon) }}}}<span [attr.style]="s.label">{{ item.label }}</span>@if (item.detail) {<span [attr.style]="s.detail">{{ item.detail }}</span>}</button>}}</div></div>`,
})
export class QuickPicker implements OnInit, OnChanges, DoCheck {
  /** The items to display and filter. */
  items: QuickPickerItem[] = []

  /** Placeholder text for the search input; `undefined` shows the default. */
  placeholder?: string

  /** Called when the user selects an item. */
  onSelect: (item: QuickPickerItem) => void = () => {}

  /** Called when the user dismisses the picker (Escape or backdrop click). */
  onDismiss: () => void = () => {}

  /** Show a loading indicator instead of the list. */
  loading = false

  /** Pre-fills the search input (the FIRST value only, as in React). */
  initialQuery?: string

  /** Extra classes on the panel. */
  className?: string

  /** The bonded ClassMap (styling tokens resolve at render time). */
  protected readonly cm: UIClassMap = getClassMap()

  /** Reactive translation, read in the injection context. */
  protected readonly i18n = useTranslation()

  /** The translation function for the template. */
  protected readonly t = this.i18n.t

  /** The theme mode signal (the selected-row tint follows the theme primary). */
  protected readonly mode = useThemeMode()

  /** Whether the viewport is phone-width (the picker anchors near the top). */
  protected readonly isNarrow = useNarrowViewport()

  /** Whether the primary pointer is coarse (the input's type grows to 16px). */
  protected readonly isCoarse = useCoarsePointer()

  /** The static style texts. */
  protected readonly s = STYLES

  /** The live search query, seeded ONCE from `initialQuery`. */
  /** The live search query, seeded ONCE from `initialQuery`. */
  protected query = ''

  /** This component's host element, for the content adoption below. */
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)

  /**
   * Adopts the backdrop and the panel beside the host every change-detection
   * pass, so the host element (a layout-neutral wrapper React does not have)
   * never appears in a `@focus` path — the kit's own session-gate convention
   * for fragment-rooted components.
   */
  ngDoCheck(): void {
    const host = this.host.nativeElement
    const parent = host.parentNode
    if (!parent) return
    for (const node of Array.from(host.childNodes)) parent.insertBefore(node, host)
  }

  /** The highlighted row (the one Enter selects, the one tinted). */
  protected selectedIndex = 0

  /** The row the `scrollIntoView` last ran for (React's `[selectedIndex]` effect). */
  private scrolledIndex = -1

  /** The search input, for the autofocus. */
  @ViewChild('input') protected input?: ElementRef<HTMLInputElement>

  /** The list element, for the scroll-into-view. */
  @ViewChild('list') protected list?: ElementRef<HTMLDivElement>

  /** Seeds the search box once (React's `useState(initialQuery ?? '')`). */
  ngOnInit(): void {
    this.query = this.initialQuery ?? ''
  }

  /**
   * Focuses the input after the first render (React's mount effect), so
   * typing can start at once. The move runs after the view check: focusing
   * during it would fire the input's `focusin` listeners while Angular is
   * still checking, and a state change they make would never render.
   */
  constructor() {
    afterNextRender(() => this.input?.nativeElement.focus())
  }

  /**
   * Keeps the selected row scrolled into view (React's effect on
   * `[selectedIndex]`), after the change-detection pass that rendered it.
   */
  ngAfterViewChecked(): void {
    if (this.scrolledIndex === this.selectedIndex) return
    this.scrolledIndex = this.selectedIndex
    const el = this.list?.nativeElement.children[this.selectedIndex] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }

  /**
   * React's `ngOnChanges`: a replaced `items` prop recomputes the filtered
   * list, and the highlight resets to the first row. The query's own changes
   * reset it in {@link onSearch}.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['items']) this.selectedIndex = 0
  }

  /**
   * The listed rows: every item while the query is blank, otherwise the
   * fuzzy matches sorted best-first (equal scores keep the input order).
   * @returns The rows, in display order.
   */
  protected filtered(): QuickPickerItem[] {
    if (!this.query.trim()) return this.items
    const scored = this.items
      .map((item) => ({ item, score: fuzzyScore(this.query, item.label) }))
      .filter((s) => s.score >= 0)
    scored.sort((a, b) => b.score - a.score)
    return scored.map((s) => s.item)
  }

  /**
   * The input's placeholder: the prop, else the translated default.
   * @returns The placeholder text.
   */
  protected placeholderText(): string {
    return (
      this.placeholder ??
      this.t('ide.quickPicker.placeholder', undefined, { defaultValue: 'Type to search…' })
    )
  }

  /**
   * The selected-row tint: the theme primary mixed over transparency, denser
   * in the dark theme (React's `selectedBg`).
   * @returns The background value.
   */
  protected selectedBg(): string {
    return this.mode() === 'light'
      ? 'color-mix(in srgb, var(--mol-color-primary, #4070e0) 12%, transparent)'
      : 'color-mix(in srgb, var(--mol-color-primary, #4070e0) 25%, transparent)'
  }

  /**
   * The panel's inline style: centered on desktop, anchored near the top on
   * phone-width viewports (the autofocus input would otherwise sit behind the
   * on-screen keyboard), with the dvh cap keeping the results above it.
   * @returns The style attribute text.
   */
  protected panelStyle(): string | null {
    const narrow = this.isNarrow()
    return styleText({
      position: 'fixed',
      top: narrow ? '10%' : '50%',
      left: '50%',
      transform: narrow ? 'translate(-50%, 0)' : 'translate(-50%, -50%)',
      width: 500,
      maxWidth: '90vw',
      maxHeight: narrow ? 'min(60dvh, 480px)' : undefined,
      display: narrow ? 'flex' : undefined,
      flexDirection: narrow ? 'column' : undefined,
      zIndex: 1001,
      borderRadius: 8,
      overflow: 'hidden',
      boxShadow:
        this.mode() === 'light' ? '0 8px 32px rgba(0,0,0,0.18)' : '0 8px 32px rgba(0,0,0,0.6)',
      background:
        this.mode() === 'light' ? 'rgb(255, 255, 255)' : 'var(--mol-color-background, #1e1e1e)',
      border: '1px solid var(--color-border, #333)',
    })
  }

  /**
   * The search input's inline style: 16px on phones and touch devices —
   * below that iOS Safari zooms the page when this (autofocused) input
   * receives focus.
   * @returns The style attribute text.
   */
  protected inputStyle(): string | null {
    return styleText({
      width: '100%',
      fontSize: this.isNarrow() || this.isCoarse() ? 16 : 13,
      padding: '10px 12px',
      // The border is written as React's DOM carries it (the parsed form of
      // `border: none` + a `border-bottom` override: four sides plus the
      // border image), because the style attribute here is written verbatim.
      borderTop: 'medium',
      borderRight: 'medium',
      borderBottom: '1px solid var(--color-border, #333)',
      borderLeft: 'medium',
      borderImage: 'none',
      background: 'transparent',
      color: 'var(--mol-color-text, currentColor)',
      outline: 'none',
      boxSizing: 'border-box',
      flexShrink: 0,
    })
  }

  /**
   * The list's inline style: on narrow viewports the flex-column container's
   * dvh cap governs instead of a fixed pixel height — the list shrinks to
   * whatever fits above the on-screen keyboard.
   * @returns The style attribute text.
   */
  protected listStyle(): string | null {
    return styleText({
      maxHeight: this.isNarrow() ? undefined : 300,
      minHeight: 0,
      overflow: 'auto',
    })
  }

  /**
   * A row's inline style: flex row of icon, label and detail; the selected
   * row carries the theme tint, the others stay transparent.
   * @param i - The row's index.
   * @returns The style attribute text.
   */
  protected rowStyle(item: QuickPickerItem, i: number): string | null {
    return styleText({
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      width: '100%',
      padding: '6px 12px',
      border: 'medium',
      color: 'var(--mol-color-text, currentColor)',
      cursor: 'pointer',
      fontSize: 13,
      textAlign: 'left',
      background: i === this.selectedIndex ? this.selectedBg() : 'transparent',
    })
  }

  /**
   * Whether a field holds a template (a node value) rather than plain text.
   * @param value - The item field.
   * @returns True when it renders through a template outlet.
   */
  protected isTemplate(value: unknown): value is TemplateRef<unknown> {
    return value instanceof TemplateRef
  }

  /**
   * The template a node-valued field renders through.
   * @param value - The item field.
   * @returns The template, or null for plain text.
   */
  protected templateOf(value: unknown): TemplateRef<unknown> | null {
    return value instanceof TemplateRef ? value : null
  }

  /**
   * The text a plain field renders (React renders strings and numbers as
   * text).
   * @param value - The item field.
   * @returns The text, or `''` for a template field.
   */
  protected textOf(value: unknown): string {
    return typeof value === 'string' || typeof value === 'number' ? String(value) : ''
  }

  /**
   * Typing: the query updates and the highlight returns to the top row (the
   * filtered list React recomputes resets it).
   * @param event - The input event.
   */
  protected onSearch(event: Event): void {
    this.query = (event.target as HTMLInputElement).value
    this.selectedIndex = 0
  }

  /**
   * The keyboard navigation: the arrows move the highlight within the
   * filtered rows (clamped), Enter selects it, Escape dismisses. Bound to the
   * panel, so a key press anywhere in it (the autofocus input first of all)
   * lands here.
   * @param event - The key press.
   */
  protected handleKeyDown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        this.selectedIndex = Math.min(this.selectedIndex + 1, this.filtered().length - 1)
        break
      case 'ArrowUp':
        event.preventDefault()
        this.selectedIndex = Math.max(this.selectedIndex - 1, 0)
        break
      case 'Enter': {
        event.preventDefault()
        const chosen = this.filtered()[this.selectedIndex]
        if (chosen) this.onSelect(chosen)
        break
      }
      case 'Escape':
        event.preventDefault()
        this.onDismiss()
        break
    }
  }

  /**
   * Hovering a row highlights it (React's `onMouseEnter` per row).
   * @param i - The hovered row's index.
   */
  protected highlight(i: number): void {
    this.selectedIndex = i
  }

  /**
   * Selects a row. React wraps `onSelect` in an arrow and calls it with NO
   * event argument.
   * @param item - The row's item.
   */
  protected pick(item: QuickPickerItem): void {
    this.onSelect(item)
  }

  /**
   * Dismisses through the backdrop. React binds the BARE `onDismiss` reference
   * as the backdrop's click handler, so the click event itself is the call's
   * argument even though the callback's type takes none (a zero-arg function
   * is assignable to a one-arg handler).
   * @param event - The native click event.
   */
  protected dismissBackdrop(event: Event): void {
    const dismiss: (event: Event) => void = this.onDismiss
    dismiss(event)
  }
}
