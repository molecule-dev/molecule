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
