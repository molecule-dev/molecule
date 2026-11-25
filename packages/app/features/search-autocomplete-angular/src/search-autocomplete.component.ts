/**
 * SearchAutocomplete component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  inject,
  type OnChanges,
  type OnDestroy,
  type OnInit,
  signal,
  type SimpleChanges,
  type TemplateRef,
  ViewChild,
} from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { fieldLayout, getClassMap } from '@molecule/app-ui'

import type { SuggestionItem } from './types.js'

/** Counter backing the per-instance ids (React's `useId()`). */
let nextGeneratedId = 0

/**
 * Whether a node-valued suggestion field is a template (a `TemplateRef`)
 * rather than plain text. Checked structurally — `TemplateRef` is a type-only
 * import in the emitted metadata, so `instanceof` is not dependable across
 * bundles.
 *
 * @param value - The field value.
 * @returns True when it renders through `ngTemplateOutlet`.
 */
const isTemplate = (value: unknown): value is TemplateRef<unknown> =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as TemplateRef<unknown>).createEmbeddedView === 'function'

/**
 * Renders a text value the way React renders a node string.
 *
 * @param value - The field value.
 * @returns The text, or `''` when there is nothing.
 */
const textOf = (value: unknown): string =>
  value === null || value === undefined ? '' : String(value)

/**
 * The popover's inline style, exactly the declaration text React serializes
 * for the same style object.
 */
const LIST_STYLE =
  'position: absolute; top: 100%; left: 0px; right: 0px; z-index: 50; background: var(--color-surface, #fff); border: 1px solid rgba(0, 0, 0, 0.1); border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.12); max-height: 320px; overflow-y: auto'

/**
 * SearchAutocomplete component.
 *
 * Search input with a typeahead suggestions popover. The host IS React's root
 * `<div>` (`div[mol-search-autocomplete]`), carrying React's class list; the
 * input surface reproduces `@molecule/app-ui-angular`'s `Input` DOM (the
 * wrapper, the inner row and the native `input`, both wrappers laid out with
 * the shared `fieldLayout`) so the combobox attributes land on the input
 * itself, exactly where React spreads them.
 */
@Component({
  selector: 'div[mol-search-autocomplete]',
  standalone: true,
  imports: [NgTemplateOutlet],
  inputs: [
    'value',
    'onChange',
    'onSearch',
    'suggestions',
    'onSelect',
    'placeholder',
    'ariaLabel',
    'debounceMs',
    'minChars',
    'className',
  ],
  host: {
    '[class]': 'classes()',
  },
  // prettier-ignore
  template: `<div [class]="field().root"><div [class]="field().inner"><input #inputEl type="search" [attr.id]="inputId" [attr.value]="value" [attr.placeholder]="placeholderText()" aria-invalid="false" [class]="inputClasses()" role="combobox" [attr.aria-label]="ariaLabelText()" aria-autocomplete="list" [attr.aria-expanded]="isExpanded() ? 'true' : 'false'" [attr.aria-controls]="listId" [attr.aria-activedescendant]="activeDescendant()" (input)="handleInput($event)" (focusin)="handleFocus()" (keydown)="handleKeydown($event)" /></div></div>@if (isExpanded()) {<ul role="listbox" [attr.id]="listId" [class]="listClasses()" [attr.style]="listStyle">@for (suggestion of list(); track suggestion.id) {<li [attr.id]="optionId($index)" role="option" [attr.aria-selected]="$index === active() ? 'true' : 'false'" tabindex="-1" data-mol-id="search-autocomplete-option" (mouseenter)="onOptionEnter($index)" (mousedown)="onOptionDown($event, suggestion)" [class]="optionClasses($index)"><div [class]="labelClasses()">@if (isTemplate(suggestion.label)) {<ng-container [ngTemplateOutlet]="asTemplate(suggestion.label)"></ng-container>}@else {{{ textOf(suggestion.label) }}}</div>@if (suggestion.meta) {<div [class]="metaClasses()">@if (isTemplate(suggestion.meta)) {<ng-container [ngTemplateOutlet]="asTemplate(suggestion.meta)"></ng-container>}@else {{{ textOf(suggestion.meta) }}}</div>}</li>}</ul>}`,
})
export class SearchAutocomplete implements OnInit, OnChanges, OnDestroy {
  /** Current input value. */
  value = ''
  /** Called whenever the input changes (React's `onChange`). */
  onChange?: (value: string) => void
  /** Async search function (React's `onSearch`). */
  onSearch?: (query: string) => Promise<SuggestionItem[]> | SuggestionItem[]
  /** Caller-controlled suggestion list (React's `suggestions`). */
  suggestions?: SuggestionItem[]
  /** Called when the user picks a suggestion (React's `onSelect`). */
  onSelect?: (item: SuggestionItem) => void
  /** Placeholder (falls back to the translated `search.placeholder`). */
  placeholder?: string
  /**
   * Accessible name for the input (React's `aria-label`); falls back to the
   * translated `search.aria.label`.
   */
  ariaLabel?: string
  /** Debounce ms for `onSearch` (React's default 200). */
  debounceMs?: number
  /** Min chars before suggestions appear (React's default 1). */
  minChars?: number
  /** Extra classes on the wrapper. */
  className?: string

  /** The native input (React's controlled-value restore targets it). */
  @ViewChild('inputEl') private inputEl?: ElementRef<HTMLInputElement>

  /**
   * Reactive translation, read in the injection context. Its `t` reads the
   * locale, so the view re-renders the text on a locale switch.
   */
  private readonly i18n = useTranslation()

  private readonly cdr = inject(ChangeDetectorRef)
  private readonly host = inject(ElementRef<HTMLElement>)

  /** The fetched suggestion rows (React's `useState<SuggestionItem[]>([])`). */
  private readonly internal = signal<SuggestionItem[]>([])
  /** Whether the popover was opened (React's `open` state). */
  private readonly open = signal(false)
  /** Index of the keyboard-highlighted option (-1 = none). */
  private readonly activeIndex = signal(-1)
  /** Monotonic id of the latest in-flight `onSearch` (the race guard). */
  private request = 0
  /** The pending debounce timer. */
  private timer: ReturnType<typeof setTimeout> | undefined
  /** The per-instance id base (React's `useId()`). */
  private readonly baseId = `mol-search-autocomplete-${nextGeneratedId++}`

  /** The listbox id (React's `${baseId}-listbox`). */
  readonly listId = `${this.baseId}-listbox`

  /** The popover's inline style (React's style object serialized). */
  readonly listStyle = LIST_STYLE

  /**
   * Starts the outside-mousedown listener and the initial search.
   */
  ngOnInit(): void {
    document.addEventListener('mousedown', this.onDoc)
  }

  /**
   * React's effects on `value`, `onSearch`, `debounceMs` and `minChars`: a
   * change restarts the debounced search, and a new query resets the highlight.
   *
   * @param changes - The inputs that changed in this pass.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if ('value' in changes) this.activeIndex.set(-1)
    if (
      'value' in changes ||
      'onSearch' in changes ||
      'debounceMs' in changes ||
      'minChars' in changes
    )
      this.scheduleSearch()
  }

  /**
   * Removes the document listener and the pending debounce timer.
   */
  ngOnDestroy(): void {
    document.removeEventListener('mousedown', this.onDoc)
    clearTimeout(this.timer)
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The classes of the input surface's two wrappers, the same shared field layout
   * `@molecule/app-ui-angular`'s `Input` renders with.
   * @returns `root` for the outer wrapper, `inner` for the control's row.
   */
  field(): ReturnType<typeof fieldLayout> {
    return fieldLayout(this.cm())
  }

  /**
   * The wrapper's class list (React's `cn(position('relative'), className)`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().position('relative'), this.className)
  }

  /**
   * The native input's class list (React's Input root classes).
   * @returns The class string.
   */
  inputClasses(): string {
    return this.cm().input({ error: false, size: 'md', align: undefined })
  }

  /**
   * The listbox's class list.
   * @returns The class string.
   */
  listClasses(): string {
    return this.cm().cn(this.cm().stack(0), this.cm().sp('p', 1))
  }

  /**
   * A row's label class (React's `fontWeight('medium')`).
   * @returns The class string.
   */
  labelClasses(): string {
    return this.cm().fontWeight('medium')
  }

  /**
   * A row's secondary line class (React's `textSize('xs')`).
   * @returns The class string.
   */
  metaClasses(): string {
    return this.cm().textSize('xs')
  }

  /**
   * One option row's class list, exactly as React composes it.
   * @param index - The row's position.
   * @returns The class string.
   */
  optionClasses(index: number): string {
    return this.cm().cn(
      this.cm().sp('px', 2),
      this.cm().sp('py', 2),
      this.cm().textSize('sm'),
      this.cm().cursorPointer,
      index === this.active() && this.cm().surfaceSecondary,
    )
  }

  /**
   * The native input's id (React's generated input id).
   * @returns The id.
   */
  get inputId(): string {
    return `${this.baseId}-input`
  }

  /**
   * Stable DOM id for the option at `index` (referenced by aria-activedescendant).
   * @param index - Option position.
   * @returns The option id.
   */
  optionId(index: number): string {
    return `${this.baseId}-option-${index}`
  }

  /**
   * The placeholder React renders: the prop, else the translated default.
   * @returns The placeholder text.
   */
  placeholderText(): string {
    return this.placeholder ?? this.i18n.t('search.placeholder', {}, { defaultValue: 'Search…' })
  }

  /**
   * The input's accessible name: the prop, else the translated default. A
   * placeholder is not a label, so the name never rests on it.
   * @returns The `aria-label` text.
   */
  ariaLabelText(): string {
    return this.ariaLabel ?? this.i18n.t('search.aria.label', undefined, { defaultValue: 'Search' })
  }

  /**
   * The suggestion list: the caller's controlled list wins over fetched results.
   * @returns The rows to render.
   */
  list(): SuggestionItem[] {
    return this.suggestions ?? this.internal()
  }

  /**
   * The popover is only visible with open + at least one suggestion.
   * @returns Whether the listbox renders.
   */
  isExpanded(): boolean {
    return this.open() && this.list().length > 0
  }

  /**
   * The highlight clamped to the current list: a list that shrinks below the
   * highlighted index leaves the old option id pointing at nothing, so every
   * read of the index (activedescendant, the highlighted option, Enter) sees
   * -1 — nothing highlighted — instead of naming an option that is gone.
   *
   * @returns The active index, or -1 when nothing is highlighted.
   */
  active(): number {
    const index = this.activeIndex()
    return index < this.list().length ? index : -1
  }

  /**
   * The highlighted option's id, or null when nothing is highlighted.
   * @returns The id, or null.
   */
  activeDescendant(): string | null {
    return this.isExpanded() && this.active() >= 0 ? this.optionId(this.active()) : null
  }

  /**
   * Whether a node value is a template rather than text.
   * @param value - The field value.
   * @returns True when it renders through `ngTemplateOutlet`.
   */
  isTemplate(value: unknown): value is TemplateRef<unknown> {
    return isTemplate(value)
  }

  /**
   * Narrows a node value to its template form.
   * @param value - The field value.
   * @returns The template.
   */
  asTemplate(value: unknown): TemplateRef<unknown> {
    return value as TemplateRef<unknown>
  }

  /**
   * A node value as text (React renders strings and numbers).
   * @param value - The field value.
   * @returns The text, or `''`.
   */
  textOf(value: unknown): string {
    return textOf(value)
  }

  /**
   * React's `debounceMs = 200` default.
   * @returns The debounce delay in ms.
   */
  private debounce(): number {
    return this.debounceMs ?? 200
  }

  /**
   * React's `minChars = 1` default.
   * @returns The minimum query length.
   */
  private threshold(): number {
    return this.minChars ?? 1
  }

  /**
   * Runs React's debounced `onSearch` effect: a query shorter than `minChars`
   * clears the results, and only the latest response may apply.
   */
  private scheduleSearch(): void {
    clearTimeout(this.timer)
    const search = this.onSearch
    const query = this.value
    if (!search || query.length < this.threshold()) {
      this.internal.set([])
      return
    }
    this.timer = setTimeout(() => {
      const token = ++this.request
      Promise.resolve(search(query))
        .then((result) => {
          // Drop a response that lost the race: only the LATEST request may
          // apply, so a slow earlier fetch can't clobber fresher results.
          if (token === this.request) this.internal.set(result)
          this.cdr.markForCheck()
        })
        .catch((_error) => {
          // Typeahead is best-effort — a failed suggestion fetch simply yields
          // no suggestions for THIS query. Guard on the token so an
          // out-of-order failure can't wipe a fresher successful result.
          if (token === this.request) this.internal.set([])
          this.cdr.markForCheck()
        })
    }, this.debounce())
  }

  /**
   * React's text-input `onChange`: report the typed value, open the popover and
   * restore the controlled value.
   *
   * @param event - The native input event.
   */
  handleInput(event: Event): void {
    this.onChange?.((event.target as HTMLInputElement).value)
    this.open.set(true)
    const input = this.inputEl?.nativeElement
    if (input && input.value !== String(this.value)) input.value = String(this.value)
  }

  /**
   * React's `onFocus`: a query at least `minChars` long opens the popover.
   */
  handleFocus(): void {
    if (this.value.length >= this.threshold()) this.open.set(true)
  }

  /**
   * Full keyboard support for the combobox: ArrowDown/ArrowUp move the
   * highlight (opening the popover if needed), Enter selects the highlighted
   * option, Escape closes.
   *
   * @param event - The keyboard event from the input.
   */
  handleKeydown(event: KeyboardEvent): void {
    const current = this.list()
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (!this.open()) {
        if (current.length > 0) this.open.set(true)
        return
      }
      if (current.length === 0) return
      this.activeIndex.update((index) => (index + 1) % current.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (!this.open()) {
        if (current.length > 0) this.open.set(true)
        return
      }
      if (current.length === 0) return
      this.activeIndex.update((index) => (index <= 0 ? current.length - 1 : index - 1))
    } else if (event.key === 'Enter') {
      const index = this.active()
      if (this.isExpanded() && index >= 0) {
        event.preventDefault()
        this.select(current[index] as SuggestionItem)
      }
    } else if (event.key === 'Escape') {
      if (this.open()) {
        event.preventDefault()
        this.open.set(false)
        this.activeIndex.set(-1)
      }
    }
  }

  /**
   * Highlights a row on pointer hover.
   * @param index - The row's position.
   */
  onOptionEnter(index: number): void {
    this.activeIndex.set(index)
  }

  /**
   * Selects a row on press: preventDefault keeps DOM focus on the input, which
   * owns the combobox.
   *
   * @param event - The mousedown event.
   * @param suggestion - The pressed suggestion.
   */
  onOptionDown(event: MouseEvent, suggestion: SuggestionItem): void {
    event.preventDefault()
    this.select(suggestion)
  }

  /**
   * Commits a suggestion selection and closes the popover.
   * @param item - The chosen suggestion.
   */
  private select(item: SuggestionItem): void {
    this.onSelect?.(item)
    this.open.set(false)
    this.activeIndex.set(-1)
  }

  /**
   * Closes the dropdown when a click occurs outside the wrapper element.
   * @param event - The document mousedown.
   */
  private readonly onDoc = (event: MouseEvent): void => {
    if (!this.open()) return
    if (this.host.nativeElement.contains(event.target as Node)) return
    this.open.set(false)
    this.activeIndex.set(-1)
    this.cdr.markForCheck()
  }
}
