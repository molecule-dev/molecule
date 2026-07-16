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
 * import { TabFilter } from '@molecule/app-tab-filter-react'
 *
 * function TicketFilters() {
 *   const [activeTab, setActiveTab] = useState('all')
 *   const tabs = [
 *     { id: 'all', label: 'All', count: 42 },
 *     { id: 'open', label: 'Open', count: 8 },
 *     { id: 'closed', label: 'Closed', count: 34 },
 *   ]
 *   return <TabFilter tabs={tabs} activeId={activeTab} onChange={setActiveTab} />
 * }
 * ```
 *
 * @remarks
 * - Requires a wired ClassMap bond (`getClassMap()` throws before
 *   bonding). Labels are ReactNode — pass translated strings.
 * - The default `filled` pill backgrounds use Material-3 token utilities
 *   (`bg-primary text-on-primary`, `bg-surface-container-low`, …) that
 *   only produce CSS when the app theme defines those tokens (flagship
 *   themes do; the minimal scaffold does not). In token-less apps pass
 *   `filled={false}` (font-weight-only active state) or add the tokens.
 * - Counts render via `toLocaleString()`; `disabled` tabs are
 *   non-interactive. Keyboard interaction is click/tab-focus only — no
 *   roving arrow-key navigation.
 *
 * @module
 */

export * from './TabFilter.js'
