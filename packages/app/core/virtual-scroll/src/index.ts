/**
 * Virtual scroll core interface for molecule.dev.
 *
 * Provides a framework-agnostic contract for virtual/infinite scrolling
 * of large lists and grids. Bond a provider (e.g.
 * `@molecule/app-virtual-scroll-tanstack`) at startup, then use
 * {@link createVirtualizer} anywhere.
 *
 * @example
 * ```typescript
 * import { createVirtualizer } from '@molecule/app-virtual-scroll'
 *
 * const virtualizer = createVirtualizer(scrollElement, {
 *   count: 10000,
 *   estimateSize: () => 50,
 *   overscan: 5,
 * })
 *
 * const items = virtualizer.getVirtualItems()
 * const totalSize = virtualizer.getTotalSize()
 * ```
 *
 * @remarks
 * - **Bond a provider before the first `createVirtualizer()` call** — the core has
 *   no fallback and throws when nothing is bonded. Wire it once at app startup
 *   (e.g. `@molecule/app-virtual-scroll-tanstack`), never inside components.
 * - **This core is HEADLESS — the app owns all rendering.** The instance returns
 *   geometry only. Render: (1) a scroll container with a constrained height and
 *   `overflow: auto`; (2) an inner spacer element sized to `getTotalSize()`;
 *   (3) ONLY the rows from `getVirtualItems()`, each absolutely positioned at
 *   `item.start` (a dynamic pixel offset — one of the few legitimate inline
 *   styles; all other styling stays on `getClassMap()`/`cm.*`, all text on `t()`).
 *   Rendering every row, or skipping the positioning, produces the overlap /
 *   blank-gap bugs the E2E checklist below catches.
 * - **Re-render on `onChange`.** The instance mutates internally as the user
 *   scrolls — pass `onChange: () => rerender()` (or your framework's subscription
 *   equivalent) or the visible window never updates.
 * - For infinite scroll call `setCount(newTotal)` after appending data (never
 *   recreate the virtualizer — that resets scroll). For variable-height rows,
 *   wire `measureElement(el)` on each rendered item.
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] A large list (hundreds+ of items) renders immediately, and only a window
 *   of rows exists in the DOM (row-element count stays far below the total).
 * - [ ] Scrolling far down (middle and end of the list) shows the CORRECT items
 *   for that position — no blank gaps, no duplicated or overlapping rows.
 * - [ ] The scrollbar reflects the full list size (jumping to the end reaches the
 *   last item, not a truncated tail).
 * - [ ] With variable-height content, fast scrolling then stopping settles with
 *   no overlap and no jitter.
 * - [ ] If wired to infinite loading, reaching the bottom loads and appends the
 *   next batch seamlessly (no scroll-position jump back to top).
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
