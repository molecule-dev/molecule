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
 * import { provider } from '@molecule/app-timeline-default'
 *
 * setProvider(provider) // once, at startup (bonds.ts)
 *
 * const timeline = requireProvider().createTimeline({
 *   items: [{ id: '1', date: new Date(), title: 'Created project' }],
 *   orientation: 'vertical',
 * })
 * timeline.addItem({ id: '2', date: new Date(), title: 'Invited teammate' })
 * ```
 *
 * @remarks
 * - **The instance is HEADLESS state, not UI.** `createTimeline` returns item
 *   management (`setItems`/`addItem`/`removeItem`/`getItems`) — nothing appears
 *   on screen. The app renders the entries itself, styling via `getClassMap()`
 *   from `@molecule/app-ui` and putting every label through
 *   `t('key', values, { defaultValue })`.
 * - **Wire the bond at startup** — {@link requireProvider} throws until
 *   `setProvider` has been called.
 * - `TimelineItem.date` is a `Date` — format it for display with the app's
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
 * - [ ] Orientation matches config: `orientation: 'vertical'` stacks entries
 *   top-to-bottom, `'horizontal'` lays them left-to-right; with `alternate` on
 *   (vertical only) consecutive entries sit on opposite sides.
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
