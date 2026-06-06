/**
 * React tab-style filter with inline count badges.
 *
 * Exports `<TabFilter>` — horizontally-scrolling pill-tabs with counts.
 *
 * @example
 * ```tsx
 * import { TabFilter } from '@molecule/app-tab-filter-react'
 *
 * const tabs = [
 *   { id: 'all', label: 'All', count: 42 },
 *   { id: 'open', label: 'Open', count: 8 },
 *   { id: 'closed', label: 'Closed', count: 34 },
 * ]
 *
 * <TabFilter tabs={tabs} activeId={activeTab} onChange={setActiveTab} />
 * ```
 *
 * @module
 */

export * from './TabFilter.js'
