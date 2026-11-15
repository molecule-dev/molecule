/**
 * Angular tab-style filter with inline count badges — the counterpart of
 * `@molecule/app-tab-filter-react`: the same props and the same DOM for the
 * same input.
 *
 * Exports `<TabFilter>` (`div[mol-tab-filter]`) — horizontally-scrolling
 * pill-tabs with counts — and the `TabFilterTab` type. Different from a plain
 * tabs row: this one surfaces per-tab count badges and scrolls horizontally on
 * overflow. Set `defaultTab` to the collection's unfiltered view: it remains
 * reachable when `tabs` changes to a path/query-selected filter. A duplicate
 * id appears once, using the default tab's definition. Pass its id to the same
 * `onChange` navigation callback.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { TabFilter } from '@molecule/app-tab-filter-angular'
 *
 * @Component({
 *   selector: 'app-ticket-filters',
 *   standalone: true,
 *   imports: [TabFilter],
 *   template: `
 *     <div
 *       mol-tab-filter
 *       [tabs]="tabs"
 *       [defaultTab]="defaultTab"
 *       [activeId]="activeTab"
 *       [onChange]="selectTab"
 *     ></div>
 *   `,
 * })
 * export class TicketFilters {
 *   activeTab = 'all'
 *   defaultTab = { id: 'all', label: 'All' }
 *   tabs = [
 *     { id: 'all', label: 'All', count: 42 },
 *     { id: 'open', label: 'Open', count: 8 },
 *     { id: 'closed', label: 'Closed', count: 34 },
 *   ]
 *   selectTab = (id: string): void => {
 *     this.activeTab = id
 *   }
 * }
 * ```
 *
 * @remarks
 * - Requires a wired ClassMap bond (`getClassMap()` throws before
 *   bonding). A tab's `label` and `icon` are text or a `TemplateRef` from an
 *   `<ng-template>` in the host template.
 * - The default `filled` pill backgrounds use Material-3 token utilities
 *   that only produce CSS when the app theme defines those tokens. In
 *   token-less apps pass `[filled]="false"` (font-weight-only active state)
 *   or add the tokens.
 * - Counts render via `toLocaleString()`; `disabled` tabs are
 *   non-interactive. Keyboard interaction is click/tab-focus only — no
 *   roving arrow-key navigation.
 *
 * @module
 */

export * from './tab-filter.component.js'
export * from './types.js'
