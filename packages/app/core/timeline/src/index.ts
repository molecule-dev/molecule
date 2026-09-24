/**
 * Timeline core interface for molecule.dev.
 *
 * Provides a standardized API for rendering timeline and activity log
 * UI components. Bond a provider (e.g. `@molecule/app-timeline-default`)
 * to supply the concrete implementation.
 *
 * @example
 * ```typescript
 * import { requireProvider, setProvider } from '@molecule/app-timeline'
 * import type { TimelineItem } from '@molecule/app-timeline'
 * import { provider } from '@molecule/app-timeline-default'
 *
 * setProvider(provider) // once, at startup (bonds.ts) — requireProvider() throws until then
 *
 * // API rows carry ISO strings — convert to Date (the bond sorts with `date.getTime()`).
 * const rows = [
 *   { id: 'a2', at: '2026-09-02T10:00:00Z', title: 'Invited teammate' },
 *   { id: 'a1', at: '2026-09-01T09:00:00Z', title: 'Created project' },
 * ]
 * const toItem = (row: (typeof rows)[number]): TimelineItem => ({
 *   id: row.id,
 *   date: new Date(row.at),
 *   title: row.title,
 * })
 *
 * const timeline = requireProvider().createTimeline({ items: rows.map(toItem) })
 * timeline.addItem({ id: 'a3', date: new Date('2026-09-03T08:30:00Z'), title: 'Deployed v1' })
 * timeline.removeItem('a2') // true
 *
 * // No change events — re-read after every mutation and re-render from the result:
 * const newestFirst = timeline.getItems().reverse() // stored OLDEST first
 * console.log(newestFirst.map((item) => item.title)) // ['Deployed v1', 'Created project']
 *
 * timeline.destroy() // on unmount
 * ```
 *
 * @remarks
 * - **The instance is HEADLESS state, not UI.** `createTimeline` returns item
 *   management (`setItems`/`addItem`/`removeItem`/`getItems`) — nothing appears
 *   on screen. The app renders the entries itself, styling via `getClassMap()`
 *   from `@molecule/app-ui` and putting every label through
 *   `t('key', values, { defaultValue })`.
 * - **Wire it with THIS package's `setProvider()` or `bond('timeline', …)`.**
 *   `setProvider()` delegates into the shared `@molecule/app-bond` registry, so
 *   both write the same slot; {@link requireProvider} throws until one has run.
 * - **No subscriptions**: `addItem`/`removeItem`/`setItems` notify nobody — read
 *   `getItems()` again and re-render. `onItemClick`/`alternate` are only stored;
 *   the default bond never calls `onItemClick` — wire clicks in your own markup.
 * - The default bond keeps items sorted OLDEST → newest by `date` (pass
 *   `createProvider({ sortByDate: false })` to keep insertion order); reverse a
 *   copy for a newest-first feed.
 * - `TimelineItem.date` is a `Date` (an ISO string from JSON breaks sorting —
 *   wrap it in `new Date(...)`); format it for display with the app's
 *   locale-aware formatting, never a hardcoded locale string.
 * - Call `destroy()` when the owning screen unmounts.
 *
 * @e2e
 * Integration checklist — drive the real timeline UI (live preview, no mocks),
 * adapt each item to this app's actual timeline/activity screens, and check
 * every box off one by one. A box you can't check is an integration bug to fix
 * — not a skip:
 * - [ ] The timeline renders its entries in the correct chronological order per
 *   the app's config (newest-first or oldest-first) — the on-screen order
 *   matches the item `date` timestamps, NOT insertion order (`getItems()`
 *   preserves insertion order; the app sorts by `date` for display).
 * - [ ] Each rendered entry shows its real data: the locale-formatted `date`
 *   (never a raw `Date` string), the `title`, and — when set — the
 *   `description`, `icon`, and dot/marker `color`.
 * - [ ] With `alternate` on, consecutive entries sit on opposite sides of the
 *   rail; with it off, every entry sits on the same side.
 * - [ ] Clicking an entry fires `onItemClick` with THAT item — the wired action
 *   (navigate/expand/select) happens for the clicked entry, not a neighbour.
 * - [ ] If the app groups entries (by day or type), each entry sits under the
 *   correct group header, and an entry dated in a different bucket renders under
 *   the right header.
 * - [ ] `addItem()` makes the new event appear in its correct position by `date`
 *   timestamp (not merely appended last), and `removeItem(id)` removes exactly
 *   that one entry.
 * - [ ] If the app loads older entries (load-more/pagination), they append via
 *   `setItems` with no duplication — every rendered `id` stays unique.
 * - [ ] An empty timeline (no items) renders a defined empty state, not a
 *   blank/broken layout; adding the first item replaces the empty state with the
 *   entry.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
