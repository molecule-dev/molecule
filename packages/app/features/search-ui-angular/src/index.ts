/**
 * Angular search UI for `@molecule/app-client-search`.
 *
 * The Angular counterpart of `@molecule/app-search-ui-react` — the same props
 * (React names) and the same DOM for the same input. Three pieces that fit a
 * `useSearchSession` from `@molecule/app-client-search-angular`:
 * {@link SearchBox} (the field, its clear button and shortcut cap, a help icon
 * whose tooltip shows the search syntax, an `afterField` projection for the
 * consumer's own tabs, the active filter chips and the hit count),
 * {@link SearchResults} (ranked rows with the matched terms marked, hover
 * prefetch, an optional action per row; the keyboard-active row is marked with
 * `aria-current` and announced through a polite status region), and
 * {@link QuickSearchDialog} (both in a `mod+k` dialog named for screen readers
 * by its `label`, "Search" by default). Every class comes from
 * the ClassMap's search tokens (`searchField`, `resultList`, …), so a UI bond
 * restyles all of it at once.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { Link } from '@molecule/app-angular'
 * import { useSearchSession } from '@molecule/app-client-search-angular'
 * import { QuickSearchDialog, SearchBox, SearchResults } from '@molecule/app-search-ui-angular'
 * import { useTranslation } from '@molecule/app-angular'
 *
 * @Component({
 *   selector: 'app-catalog',
 *   standalone: true,
 *   imports: [Link, SearchBox, SearchResults],
 *   template: `
 *     <div mol-search-box
 *       [value]="session.query()"
 *       [onChange]="session.setQuery"
 *       [onKeyDown]="session.onKeyDown"
 *       [inputRef]="session.inputRef"
 *       placeholder="Search packages"
 *       [count]="session.hits().length"
 *       [filters]="session.parsed().filters"
 *       [onRemoveFilter]="session.removeFilter"
 *       [onClear]="session.clear"
 *       [examples]="['category:auth', 'type:bond']"
 *     ></div>
 *     <mol-search-results
 *       [hits]="session.hits()"
 *       [view]="view"
 *       [activeIndex]="session.activeIndex()"
 *       [onActivate]="session.setActiveIndex"
 *       [onOpen]="session.open"
 *       [onPrefetch]="session.prefetch"
 *       [renderLink]="link"
 *       emptyText="Nothing matches"
 *     ></mol-search-results>
 *     <ng-template #link let-p>
 *       <a molLink [to]="p.href" [state]="p.state" [className]="p.className" (click)="p.onClick($event)">
 *         <ng-template [ngTemplateOutlet]="p.children" [ngTemplateOutletContext]="{ $implicit: hit }"></ng-template>
 *       </a>
 *     </ng-template>
 *   `,
 * })
 * export class Catalog {
 *   readonly t = useTranslation().t
 *   readonly session = useSearchSession({
 *     docs: packages,
 *     options: PACKAGE_INDEX_OPTIONS,
 *     rememberKey: 'catalog.search',
 *     onOpen: (p) => navigate(`/packages/${p.name}`),
 *   })
 *   readonly view = (p: Pkg) => ({ href: `/packages/${p.name}`, title: `@molecule/${p.name}`, description: p.description, meta: [p.type, p.category], mono: true })
 * }
 * ```
 *
 * (`searchPlaceholder` and `nothingMatches` are the app's own translated strings.)
 *
 * @remarks
 * - **Pass a router link through `renderLink`**, or every row is a full page
 *   load: the list renders a plain `<a>` by default because it does not know
 *   your router. A plain click calls `onOpen` (which the session turns into
 *   navigation); a modified click is left to the browser so "open in new tab" works.
 * - The box does not own the text: bind `value`/`onChange` to a session (or
 *   any state) and it stays mounted, with its text, across searches. Do not
 *   remount it per search.
 * - `placeholder`, `emptyText` and the like are already-translated strings
 *   from the app; the package translates only its own chrome ("Clear
 *   search", "{{count}} results", "Search tips") through `@molecule/app-locales-search-ui`.
 * - The quick dialog needs a session created with `syncUrl: false` and
 *   `onEscape: onClose`; the page's own session keeps the URL.
 * - Node-valued React props are projected content: `afterField` is selected
 *   by `[slot=afterField]`, and a render function (`renderLink`, `action`) is
 *   a `TemplateRef` whose context carries its argument as `$implicit`.
 *
 * @module
 */

export * from './highlight.component.js'
export * from './kbd.component.js'
export * from './quick-search-dialog.component.js'
export * from './search-box.component.js'
export * from './search-results.component.js'
export * from './types.js'
