/**
 * SearchBox component (React parity).
 *
 * @module
 */

import {
  afterNextRender,
  type AfterViewInit,
  Component,
  type ElementRef,
  inject,
  Injector,
  type OnChanges,
  signal,
  type SimpleChanges,
  ViewChild,
  type WritableSignal,
} from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { ClientSearchFilter } from '@molecule/app-client-search'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Icon, Tooltip } from '@molecule/app-ui-angular'

import { Kbd } from './kbd.component.js'

/** One stable record per chip key, so the rendered chips follow React's keyed reuse. */
interface ChipRecord {
  /** The chip's composite key (React's). */
  key: string
  /** The chip's filter. */
  filter: ClientSearchFilter
  /** The chip's index. */
  index: number
}

/**
 * SearchBox component.
 *
 * A search field: a leading icon, the input, a help icon that shows the
 * syntax on hover, an × to clear, and the shortcut cap; under it, whatever
 * `afterField` holds (projected as `[slot=afterField]`), then the active
 * filters as removable chips and the hit count. The field stays mounted, and
 * its text with it, across searches. The host IS the outer `<div>` React
 * renders (`div[mol-search-box]`).
 */
@Component({
  selector: 'div[mol-search-box]',
  standalone: true,
  imports: [Icon, Kbd, Tooltip],
  inputs: [
    'value',
    'onChange',
    'onKeyDown',
    'inputRef',
    'placeholder',
    'label',
    'count',
    'filters',
    'onRemoveFilter',
    'onClear',
    'examples',
    'shortcut',
    'autoFocus',
    'molId',
    'className',
  ],
  host: {
    '[attr.data-mol-id]': 'id() + "-box"',
  },
  template: `<div [class]="fieldClasses()">
      <span [class]="cm().cn(cm().searchFieldIcon)" aria-hidden="true">
        <svg mol-icon-root [name]="'search'" [size]="18"></svg>
      </span>
      <input
        #searchInput
        type="search"
        [value]="value"
        [attr.value]="restoreValue()"
        (input)="onType($event)"
        (keydown)="handKeyDown($event)"
        (focus)="focused.set(true)"
        (blur)="focused.set(false)"
        [attr.placeholder]="placeholder"
        [attr.aria-label]="ariaLabel()"
        autocomplete="off"
        autocorrect="off"
        spellcheck="false"
        enterkeyhint="search"
        [class]="cm().cn(cm().searchFieldInput)"
        [attr.data-mol-id]="id() + '-input'"
      />
      <span [class]="cm().cn(cm().searchFieldActions)">
        @if (showHelp()) {
          <mol-tooltip placement="bottom-end">
            <button
              type="button"
              [attr.aria-label]="helpLabel()"
              [class]="cm().cn(cm().searchFieldClear)"
              [attr.data-mol-id]="id() + '-help'"
            >
              <svg mol-icon-root [name]="'question'" [size]="16"></svg>
            </button>
            <ng-container ngProjectAs="[slot=content]">
              <div [class]="cm().cn(cm().searchTips)" [style]="tipsStyle()">
                {{ syntaxText() }}{{ ' ' }}
                @for (ex of exampleList(); track ex; let i = $index) {
                  <span
                    >{{ separator(i) }}<code>{{ ex }}</code></span
                  >
                }
                {{ ' · ' }}<kbd mol-kbd>↑</kbd> {{ ' ' }}<kbd mol-kbd>↓</kbd> {{ ' '
                }}<kbd mol-kbd>↵</kbd> {{ ' ' }}{{ keysText() }}
              </div>
            </ng-container>
          </mol-tooltip>
        }
        @if (showClear()) {
          <button
            type="button"
            (click)="onClearClick()"
            [attr.aria-label]="clearLabel()"
            [class]="cm().cn(cm().searchFieldClear)"
            [attr.data-mol-id]="id() + '-clear'"
          >
            <span aria-hidden="true">×</span>
          </button>
        }
        @if (showCap()) {
          <kbd mol-kbd>{{ shortcutText() }}</kbd>
        }
      </span>
    </div>
    <ng-content select="[slot=afterField]"></ng-content>
    @if (hasStatus()) {
      <div [class]="cm().cn(cm().searchStatusRow)">
        @for (chip of chipRecords(); track chip) {
          <button
            type="button"
            (click)="onRemoveFilter?.(chip.index)"
            [attr.aria-label]="chipLabel(chip.filter)"
            [class]="chipClasses(chip.filter)"
            [attr.data-mol-id]="id() + '-filter'"
            [attr.data-filter-field]="chip.filter.field"
          >
            {{ chipText(chip.filter) }}
            <span [class]="cm().cn(cm().filterChipRemove)" aria-hidden="true">×</span>
          </button>
        }
        <span [class]="cm().cn(cm().mxAuto)"></span>
        @if (countText(); as countLabel) {
          <span [attr.data-mol-id]="id() + '-count'">{{ countLabel }}</span>
        }
      </div>
    }`,
})
export class SearchBox implements AfterViewInit, OnChanges {
  /** The text. */
  value = ''
  /** Called with the new text on every keystroke. */
  onChange?: (value: string) => void
  /** Key handling for the input (arrows, Enter, Escape), usually a session's `onKeyDown`. */
  onKeyDown?: (event: KeyboardEvent) => void
  /** A ref to the input, so a shortcut can focus it. */
  inputRef?: { current: HTMLInputElement | null }
  /** Placeholder, already translated. Also the accessible name unless `label` is given. */
  placeholder = ''
  /** Accessible name for the input, already translated. Defaults to `placeholder`. */
  label?: string
  /** How many hits the current text has. Omit to show no count. */
  count?: number
  /** Active `field:value` filters, shown as removable chips. */
  filters?: ClientSearchFilter[]
  /** Removes the i-th filter. */
  onRemoveFilter?: (index: number) => void
  /** Clears the text. Shown as an × while there is text. */
  onClear?: () => void
  /**
   * Example tokens for the search tips, e.g. `['category:auth', 'type:bond']`.
   * Given, a help icon sits inside the field and shows the syntax on hover or
   * focus. Omit for no help icon.
   */
  examples?: string[]
  /** The key that focuses the box, shown as a cap while it is empty. `null` hides it. Defaults to `/`. */
  shortcut?: string | null
  /** Focus the input on mount. */
  autoFocus?: boolean
  /** `data-mol-id` prefix: `<molId>-input`, `-clear`, `-help`, `-filter`, `-count`. */
  molId?: string
  /** Extra classes composed onto the field. */
  className?: string

  /** Whether the field holds focus (React's `focused` state). */
  readonly focused: WritableSignal<boolean> = signal(false)

  /** The input element, read for the ref and the focus requests. */
  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>

  /** Schedules the deferred focus from the view hooks (outside an injection context). */
  private readonly injector = inject(Injector)

  /** i18n handle, read in an injection context. */
  readonly t = useTranslation().t

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The `data-mol-id` prefix (React's default parameter).
   * @returns The prefix.
   */
  id(): string {
    return this.molId ?? 'search'
  }

  /**
   * The active filters (React's default parameter: `[]`).
   * @returns The filters.
   */
  filterList(): ClientSearchFilter[] {
    return this.filters ?? []
  }

  /**
   * The field's class list (`cm.searchField` + `className`).
   * @returns The class string.
   */
  fieldClasses(): string {
    return this.cm().cn(this.cm().searchField, this.className)
  }

  /**
   * The input's accessible name (`label`, else the placeholder).
   * @returns The accessible name.
   */
  ariaLabel(): string {
    return this.label ?? this.placeholder
  }

  /**
   * Whether the text is not blank, the branch that shows the count.
   * @returns True while the text has content.
   */
  hasText(): boolean {
    return this.value.trim().length > 0
  }

  /**
   * Whether the count shows: a count was given and the text is not blank.
   * @returns True to show the count.
   */
  showCount(): boolean {
    return this.count !== undefined && this.hasText()
  }

  /**
   * Whether the status row (chips and count) renders.
   * @returns True when a chip or the count renders.
   */
  hasStatus(): boolean {
    return this.filterList().length > 0 || this.showCount()
  }

  /**
   * Whether the help icon renders (examples were given).
   * @returns True to show the help icon.
   */
  showHelp(): boolean {
    return Boolean(this.examples?.length)
  }

  /**
   * The example tokens plus the two always-present tokens, as React builds them.
   * @returns The tips' example list.
   */
  exampleList(): string[] {
    return [
      ...(this.examples ?? []),
      this.t('searchUi.examplePhrase', undefined, { defaultValue: '"exact phrase"' }),
      this.t('searchUi.exampleExcluded', undefined, { defaultValue: '-word' }),
    ]
  }

  /**
   * Whether the clear button shows: text present and `onClear` given.
   * @returns True to show the clear button.
   */
  showClear(): boolean {
    return Boolean(this.value) && Boolean(this.onClear)
  }

  /**
   * The shortcut cap's key, or null while hidden (React's default `/`).
   * @returns The cap key or null.
   */
  capKey(): string | null {
    return this.shortcut === undefined ? '/' : this.shortcut
  }

  /**
   * Whether the cap shows: a key, no text, and the field not focused.
   * @returns True to show the cap.
   */
  showCap(): boolean {
    return Boolean(this.capKey()) && !this.value && !this.focused()
  }

  /**
   * The cap's key text (a template may not bind a nullable value).
   * @returns The key, or the empty string while hidden.
   */
  shortcutText(): string {
    return this.capKey() ?? ''
  }

  /**
   * The tips line's inline style (React's `whiteSpace`/`maxWidth`).
   * @returns The style string.
   */
  tipsStyle(): string {
    return 'white-space: normal; max-width: 360px'
  }

  /**
   * A tips example's leading separator (' · ' from the second on), as React
   * builds it.
   *
   * @param index - The example's index.
   * @returns The separator text.
   */
  separator(index: number): string {
    return index > 0 ? ' · ' : ''
  }

  /**
   * The help icon's accessible label.
   * @returns The translated label.
   */
  helpLabel(): string {
    return this.t('searchUi.help', undefined, { defaultValue: 'Search tips' })
  }

  /**
   * The clear button's accessible label.
   * @returns The translated label.
   */
  clearLabel(): string {
    return this.t('searchUi.clear', undefined, { defaultValue: 'Clear search' })
  }

  /**
   * The syntax sentence (the tips' first span).
   * @returns The translated text.
   */
  syntaxText(): string {
    return this.t('searchUi.syntax', undefined, {
      defaultValue: 'Narrow with a field, quote a phrase, or exclude a word:',
    })
  }

  /**
   * The keys sentence (the tips' last span).
   * @returns The translated text.
   */
  keysText(): string {
    return this.t('searchUi.keys', undefined, {
      defaultValue: 'The arrow keys move through the results and Enter opens one.',
    })
  }

  /**
   * The hit-count text, or null while blank or without a count.
   * @returns The translated count, or null.
   */
  countText(): string | null {
    const count = this.count
    if (count === undefined || !this.hasText()) return null
    return this.t('searchUi.count', { count }, { defaultValue: '{{count}} results' })
  }

  /**
   * A chip's text: a negation mark, the field and the accepted values.
   *
   * @param f - The filter.
   * @returns The chip text.
   */
  chipText(f: ClientSearchFilter): string {
    return `${f.negate ? '−' : ''}${f.field}: ${f.values.join(', ')}`
  }

  /**
   * A chip's accessible label (the removal announcement).
   *
   * @param f - The filter.
   * @returns The translated label.
   */
  chipLabel(f: ClientSearchFilter): string {
    return this.t(
      'searchUi.removeFilter',
      { filter: this.chipText(f) },
      {
        defaultValue: 'Remove filter {{filter}}',
      },
    )
  }

  /**
   * A chip's tracking key, React's composite key.
   *
   * @param f - The filter.
   * @param index - The chip's index.
   * @returns The key.
   */
  chipKey(f: ClientSearchFilter, index: number): string {
    return `${f.field}:${f.values.join(',')}:${index}`
  }

  /** The cached chip records and the key signature they were built from. */
  private chipCache: { signature: string; records: ChipRecord[] } | null = null

  /**
   * The chip records the template iterates: one stable wrapper per chip while
   * the key sequence is unchanged, and fresh wrappers whenever it changes.
   * React keys each chip by its composite key, so an unchanged key keeps the
   * rendered chip (and everything stamped on it) while a changed key replaces
   * it; Angular's keyed loop recomputes keys with the new indices and would
   * reuse a view across a reorder, so the records — and the reuse they drive
   * — are built here instead.
   *
   * @returns The chip records, in order.
   */
  chipRecords(): ChipRecord[] {
    const filters = this.filterList()
    const signature = filters.map((f, i) => this.chipKey(f, i)).join('|')
    if (!this.chipCache || this.chipCache.signature !== signature) {
      this.chipCache = {
        signature,
        records: filters.map((f, i) => ({
          key: this.chipKey(f, i),
          filter: f,
          index: i,
        })),
      }
    }
    return this.chipCache.records
  }

  /**
   * A chip's class list (`cm.filterChip`, negated when the filter negates).
   *
   * @param f - The filter.
   * @returns The class string.
   */
  chipClasses(f: ClientSearchFilter): string {
    return this.cm().cn(this.cm().filterChip, f.negate && this.cm().filterChipNegated)
  }

  /**
   * The value the controlled input restores after a keystroke the caller did
   * not adopt, the way React renders its controlled input back.
   * @returns The current prop value.
   */
  restoreValue(): string {
    return this.value
  }

  /**
   * Reports the typed text, then restores the field to the value the props
   * still hold, the way React's controlled input renders it back when the
   * caller keeps the old one.
   *
   * @param event - The input event.
   */
  onType(event: Event): void {
    const el = event.target as HTMLInputElement
    this.onChange?.(el.value)
    el.value = this.value
    el.setAttribute('value', this.value)
  }

  /** Clears the text and puts focus back in the field, as React's button does. */
  onClearClick(): void {
    this.onClear?.()
    this.inputRef?.current?.focus()
  }

  /**
   * Hands a key press to `onKeyDown` the way React's text field does. A legacy IME
   * reports key code 229 while it composes and on the Enter that confirms it, even
   * after composing ended: that Enter is cancelled first, so it submits nothing, and
   * the event reports the IME as composing. A composition still under way is the
   * IME's own and is handed over as it is. A field given no key handler cancels nothing.
   *
   * @param event - The input's keydown event.
   */
  handKeyDown(event: KeyboardEvent): void {
    if (!this.onKeyDown) return
    const composing = event.isComposing
    const legacyComposition = event.keyCode === 229
    if (!composing && legacyComposition && event.key === 'Enter') event.preventDefault()
    if (legacyComposition) Object.defineProperty(event, 'isComposing', { value: true })
    this.onKeyDown(event)
  }

  /**
   * Assigns the input element into `inputRef`, as React's `ref` does, then
   * requests the mount focus.
   */
  ngAfterViewInit(): void {
    this.captureRef()
    this.scheduleFocus()
  }

  /**
   * Re-assigns the ref and re-runs the focus request when their inputs change,
   * the way React's effect keyed on `autoFocus` and `inputRef` does.
   *
   * @param changes - The changed inputs.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['inputRef']) this.captureRef()
    if (changes['autoFocus'] || changes['inputRef']) this.scheduleFocus()
  }

  /**
   * Schedules the focus request after the render, so the field exists and the
   * `focusin` it fires reaches listeners after Angular has checked the view.
   */
  private scheduleFocus(): void {
    afterNextRender(() => this.focusIfAsked(), { injector: this.injector })
  }

  /** Writes the input element into `inputRef`, as React's `ref` does. */
  private captureRef(): void {
    if (this.inputRef) this.inputRef.current = this.searchInput?.nativeElement ?? null
  }

  /** Focuses the input when `autoFocus` asks and the element exists. */
  private focusIfAsked(): void {
    if (this.autoFocus) this.inputRef?.current?.focus()
  }
}
