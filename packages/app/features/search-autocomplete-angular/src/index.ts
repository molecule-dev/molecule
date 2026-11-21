/**
 * Search input with a typeahead suggestion popover.
 *
 * Exports `<SearchAutocomplete>` (an attribute-selector component:
 * `div[mol-search-autocomplete]`, whose host is React's root `<div>`) and the
 * `SuggestionItem<T>` type (`{ id, label, meta?, data? }`). Two data modes —
 * pass ONE of: `onSearch(query)` (async fetch, debounced; default 200 ms) or
 * `suggestions` (caller-controlled list). Other props: `value` / `onChange`
 * (controlled input), `onSelect(item)`, `placeholder?` (defaults to the
 * translated `search.placeholder`), `debounceMs?`, `minChars?` (default 1),
 * `className?`.
 *
 * Angular counterpart of `@molecule/app-search-autocomplete-react`: the same
 * exports, the same props (React names) and the same DOM for the same input.
 *
 * @example
 * ```ts
 * import { Component, signal } from '@angular/core'
 * import {
 *   SearchAutocomplete,
 *   type SuggestionItem,
 * } from '@molecule/app-search-autocomplete-angular'
 *
 * @Component({
 *   selector: 'app-user-search',
 *   standalone: true,
 *   imports: [SearchAutocomplete],
 *   template: `
 *     <div
 *       mol-search-autocomplete
 *       [value]="query()"
 *       [onChange]="setQuery"
 *       [onSearch]="fetchUsers"
 *       [onSelect]="pick"
 *       placeholder="Search users…"
 *     ></div>
 *   `,
 * })
 * export class UserSearch {
 *   readonly query = signal('')
 *   readonly setQuery = (next: string): void => this.query.set(next)
 *   readonly fetchUsers = (q: string): Promise<SuggestionItem<{ id: string }>[]> =>
 *     fetch(`/api/users?q=${encodeURIComponent(q)}`).then((r) => r.json())
 *   readonly pick = (item: SuggestionItem<{ id: string }>): void => console.log(item.data?.id)
 * }
 * ```
 *
 * @remarks
 * - Throws unless provided the binding's molecule providers (`@molecule/app-angular`)
 *   with a bonded ClassMap and i18n provider.
 * - Full keyboard support: it's an ARIA combobox — ArrowDown/ArrowUp move the
 *   highlight (opening the popover), Enter selects the highlighted option, and
 *   Escape closes. `aria-activedescendant` tracks the active `role="option"`.
 * - Stale-response safe: out-of-order `onSearch` responses are dropped (each
 *   request carries a token; only the latest applies), so a slow earlier fetch
 *   can't overwrite fresher results. `onSearch` needs no cancellation of its own.
 * - The popover surface uses `var(--color-surface)` with a WHITE fallback
 *   and black-alpha borders — define `--color-surface` (dark themes) or the
 *   dropdown stays light.
 * - Default placeholder translations: `@molecule/app-locales-search-autocomplete`.
 *
 * @module
 */

export * from './search-autocomplete.component.js'
export * from './types.js'
