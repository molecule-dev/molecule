/**
 * React tab-style filter with inline count badges.
 *
 * Exports `<TabFilter>` — horizontally-scrolling pill-tabs with counts —
 * and the `TabFilterTab` type. Different from `<Tabs>` in
 * `@molecule/app-ui-react`: this one surfaces per-tab count badges and
 * scrolls horizontally on overflow.
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 *
 * import { TabFilter, type TabFilterTab } from '@molecule/app-tab-filter-react'
 *
 * export function TicketList() {
 *   const tickets = [
 *     { id: 'T-1', title: 'Login fails on Safari', status: 'open' },
 *     { id: 'T-2', title: 'Invoice PDF is blank', status: 'closed' },
 *     { id: 'T-3', title: 'Refund not issued', status: 'open' },
 *   ]
 *   const [activeTab, setActiveTab] = useState('all')
 *   const tabs: TabFilterTab[] = [
 *     { id: 'all', label: 'All', count: tickets.length },
 *     { id: 'open', label: 'Open', count: tickets.filter((t) => t.status === 'open').length },
 *     { id: 'closed', label: 'Closed', count: tickets.filter((t) => t.status === 'closed').length },
 *   ]
 *   const visible = activeTab === 'all' ? tickets : tickets.filter((t) => t.status === activeTab)
 *   return (
 *     <section>
 *       <TabFilter tabs={tabs} activeId={activeTab} onChange={setActiveTab} />
 *       <ul>
 *         {visible.map((ticket) => (
 *           <li key={ticket.id}>{ticket.title}</li>
 *         ))}
 *       </ul>
 *     </section>
 *   )
 * }
 * ```
 *
 * @remarks
 * - It is CONTROLLED and does NOT filter anything: it only reports the
 *   clicked tab id via `onChange`. Keep `activeId` in your state, filter
 *   your list yourself, and compute each tab's `count` yourself.
 * - Props are `activeId` / `onChange(id)` (not `value` / `onSelect`);
 *   `onChange` is never called for `disabled` tabs.
 * - Requires a wired ClassMap bond (`setClassMap(classMap)` from
 *   `@molecule/app-ui`; `getClassMap()` throws before bonding). Labels are
 *   ReactNode — pass translated strings.
 * - Pill styling comes from the ClassMap `tabsTrigger` token:
 *   `filled` (default) uses its `solid-rounded` variant, `filled={false}`
 *   its `soft-rounded` variant.
 * - Counts render as `(n)` via `toLocaleString()`. Keyboard interaction is
 *   click/tab-focus only — no roving arrow-key navigation, and there are
 *   no `tabpanel`s (this is a filter row, not a tab container).
 *
 * @module
 */

export * from './TabFilter.js'
