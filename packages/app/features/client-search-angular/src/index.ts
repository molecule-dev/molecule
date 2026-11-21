/**
 * Angular hooks for `@molecule/app-client-search`.
 *
 * Three headless hooks: {@link useClientSearchIndex} builds the index from a
 * list, {@link useClientSearch} keeps an input's text and its hits, and
 * {@link useListNavigation} moves through the hits with the keyboard. The app
 * renders the input and the list itself, styled with `getClassMap()`.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import {
 *   useClientSearch,
 *   useClientSearchIndex,
 *   useListNavigation,
 * } from '@molecule/app-client-search-angular'
 *
 * @Component({
 *   selector: 'app-package-search',
 *   template: `
 *     <input
 *       [value]="search.query()"
 *       (input)="search.setQuery($any($event.target).value)"
 *       (keydown)="nav.onKeyDown($event)"
 *     />
 *     <ul>
 *       @for (hit of search.hits(); track hit.id; let i = $index) {
 *         <li [attr.aria-selected]="i === nav.activeIndex()">{{ hit.doc.name }}</li>
 *       }
 *     </ul>
 *   `,
 * })
 * export class PackageSearchComponent {
 *   // The records the page already holds.
 *   readonly packages = packages
 *   // A field initializer runs in the injection context the hooks need.
 *   private readonly index = useClientSearchIndex(() => this.packages, {
 *     idField: 'name',
 *     fields: ['name', 'description', 'exports'],
 *     filterFields: ['category', 'type'],
 *     boost: { name: 3 },
 *   })
 *   readonly search = useClientSearch(this.index, { limit: 50 })
 *   readonly nav = useListNavigation(() => ({
 *     count: this.search.hits().length,
 *     onSelect: (i: number) => openPackage(this.search.hits()[i]!.doc),
 *     onEscape: () => this.search.setQuery(''),
 *   }))
 * }
 * ```
 *
 * @remarks
 * - **Pass a stable list.** `useClientSearchIndex` rebuilds only when the
 *   `docs` array identity changes; a list rebuilt on every change detection
 *   (`.filter` in a getter) rebuilds the index on every keystroke. Keep it in a
 *   signal.
 * - **Blank text returns every document**, so the same list renders the
 *   browse state and the search state; there is no separate "no query" path
 *   to write. Check `active()` when the empty state should look different.
 * - `useListNavigation` resets the highlight when the hit count changes and
 *   ignores keys with modifiers, so `Cmd+Enter` and friends stay free for the
 *   app. Wire `Enter` to real navigation (the URL changes), not just a
 *   highlight.
 * - `useSearchSession` is the whole thing wired up: text ↔ `#q=` in the address
 *   bar, a remembered query across pages (through the bonded storage), keyboard
 *   navigation, Enter opening a hit, top hits prefetched, and an optional
 *   `augment` that appends hits from elsewhere (an API) as "related".
 * - Call these in an injection context (a component field initializer or a
 *   constructor): they create signals, `computed`s and `effect`s. They render
 *   nothing and register no global key. Bind `/` or `Cmd+K` to focus the input
 *   through `@molecule/app-keyboard-shortcuts-angular`.
 *
 * @module
 */

export * from './hashQuery.js'
export * from './types.js'
export * from './useClientSearch.js'
export * from './useClientSearchIndex.js'
export * from './useLazyDocs.js'
export * from './useListNavigation.js'
export * from './useSearchSession.js'
