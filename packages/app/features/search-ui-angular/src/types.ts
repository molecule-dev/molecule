/**
 * Types of `@molecule/app-search-ui-angular` — the Angular counterpart of
 * `@molecule/app-search-ui-react`, same props and DOM.
 *
 * @module
 */

import type { TemplateRef } from '@angular/core'

import type { ClientSearchDocument, ClientSearchFilter } from '@molecule/app-client-search'
import type { SearchSession } from '@molecule/app-client-search-angular'

/**
 * Props accepted by {@link Kbd} — `children` is projected content in Angular
 * (an input cannot carry a node), so it is typed `unknown`: put it inside the
 * element, not in a binding.
 */
export interface KbdProps {
  /** The key or keys shown, e.g. `/`, `↵`, `esc`, inside the element. */
  children?: unknown
  /** Extra classes composed onto the cap. */
  className?: string
}

/** Props for {@link Highlight} — the text renders inside the element. */
export interface HighlightProps {
  /** The text to show. */
  text: string
  /** The matched terms to mark (a hit's `terms`). */
  terms: string[]
}

/**
 * Props accepted by {@link SearchBox}. `afterField` is projected content
 * (`[slot=afterField]`), not an input.
 */
export interface SearchBoxProps {
  /** The text. */
  value: string
  /** Called with the new text on every keystroke. */
  onChange: (value: string) => void
  /** Key handling for the input (arrows, Enter, Escape), usually a session's `onKeyDown`. */
  onKeyDown?: (event: KeyboardEvent) => void
  /** A ref to the input, so a shortcut can focus it. */
  inputRef?: { current: HTMLInputElement | null }
  /** Placeholder, already translated. Also the accessible name unless `label` is given. */
  placeholder: string
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
  /**
   * Rendered directly under the field, before the status row (chips and
   * count), so a consumer can put its own controls — tabs, a scope switch —
   * right below the input. Projected as `[slot=afterField]` content.
   */
  afterField?: unknown
  /** `data-mol-id` prefix: `<molId>-input`, `-clear`, `-help`, `-filter`, `-count`. */
  molId?: string
  /** Extra classes composed onto the field. */
  className?: string
}

/** What the list needs from a hit. A session's hits already have this shape. */
export interface SearchResultHit<T> {
  id: string
  doc: T
  /** The matched terms, marked in the title and description. */
  terms: string[]
  /** Found by meaning rather than by the words typed. */
  related?: boolean
}

/** How one hit renders. */
export interface SearchResultView {
  /** Where the row goes. */
  href: string
  /** The row's title. */
  title: string
  /** Under the title, clamped to two lines. */
  description?: string
  /** Small facts after the title: type, category, source. */
  meta?: string[]
  /** Render the title in monospace (a package name). */
  mono?: boolean
  /** Opaque data handed to `renderLink` (router state). */
  state?: unknown
}

/** Props the row's link gets; `renderLink` turns them into markup. */
export interface SearchResultLinkProps {
  href: string
  className: string
  children: unknown
  onClick: (event: MouseEvent) => void
  state?: unknown
  'data-mol-id': string
}

/** Props for {@link SearchResults}. */
export interface SearchResultsProps<T extends ClientSearchDocument> {
  hits: SearchResultHit<T>[]
  /** How a hit renders. */
  view: (doc: T) => SearchResultView
  /** The keyboard- or pointer-active row, or `-1`. */
  activeIndex: number
  /** The pointer moved onto a row. */
  onActivate?: (index: number) => void
  /** A row was chosen (a plain click, or Enter elsewhere). Navigation is the caller's. */
  onOpen: (doc: T) => void
  /** The person is about to open a row (hover, focus, touch): warm its page. */
  onPrefetch?: (doc: T) => void
  /**
   * Renders the row's link. Defaults to a plain `<a>`; pass a router link to
   * keep navigation client-side. In Angular this is a `TemplateRef` whose
   * context carries the link props as `$implicit`.
   */
  renderLink?: TemplateRef<{ $implicit: SearchResultLinkProps }>
  /** Something at the row's end (an action button); a `TemplateRef` over the hit's document. */
  action?: TemplateRef<{ $implicit: T }>
  /** Shown when there are no hits. */
  emptyText: string
  /** `data-mol-id` prefix: `<molId>-results`, `-hit`, `-link`, `-related`, `-empty`, `-active`. */
  molId?: string
  /** Extra classes composed onto the list. */
  className?: string
}

/** Props for {@link QuickSearchDialog}. */
export interface QuickSearchDialogProps<T extends ClientSearchDocument> {
  /** Whether the dialog is open. Rendered only while open. */
  open: boolean
  /** Close it (Escape with nothing typed, the overlay, or after opening a hit). */
  onClose: () => void
  /** The search session (from `useSearchSession`), created with `syncUrl: false` and `onEscape: onClose`. */
  session: SearchSession<T>
  /** How a hit renders. */
  view: (doc: T) => SearchResultView
  /** Placeholder for the box, already translated. */
  placeholder: string
  /** Example tokens for the tips line. */
  examples?: string[]
  /** Shown while the text matches nothing, already translated. */
  emptyText: string
  /** Shown before anything is typed, already translated. Defaults to the empty text. */
  idleText?: string
  /** Renders each row's link; a `TemplateRef` whose context carries the link props as `$implicit`. */
  renderLink?: TemplateRef<{ $implicit: SearchResultLinkProps }>
  /**
   * The dialog's accessible name, already translated (like `placeholder`, it
   * names nothing visible). Defaults to `t('searchUi.dialogLabel')`
   * ("Search"); the field's placeholder already names the field.
   */
  label?: string
  /** `data-mol-id` prefix. Defaults to `quick-search`. */
  molId?: string
}
