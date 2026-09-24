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
 * import { getClassMap, setClassMap } from '@molecule/app-ui'
 * import { classMap } from '@molecule/app-ui-tailwind'
 * import { createVirtualizer, setProvider } from '@molecule/app-virtual-scroll'
 * import type { VirtualScrollInstance } from '@molecule/app-virtual-scroll'
 * import { provider } from '@molecule/app-virtual-scroll-tanstack'
 *
 * // Startup (bonds.ts) — createVirtualizer() throws until a provider is bonded.
 * setClassMap(classMap)
 * setProvider(provider)
 *
 * const rows = Array.from({ length: 10_000 }, (_, i) => `Row ${i + 1}`)
 * const cm = getClassMap()
 *
 * // (1) Scroll container: constrained height + its own scrollbar.
 * const scrollElement = document.createElement('div')
 * scrollElement.style.height = '480px'
 * scrollElement.style.overflowY = 'auto'
 * // (2) Spacer sized to the FULL list so the scrollbar is right.
 * const spacer = document.createElement('div')
 * spacer.className = cm.position('relative')
 * scrollElement.append(spacer)
 * document.body.append(scrollElement)
 *
 * // (3) Render ONLY the visible rows, each positioned at item.start (px).
 * const render = (virtualizer: VirtualScrollInstance): void => {
 *   spacer.style.height = `${virtualizer.getTotalSize()}px`
 *   const rendered = virtualizer.getVirtualItems().map((item) => {
 *     const row = document.createElement('div')
 *     row.className = cm.cn(cm.position('absolute'), cm.w('full'))
 *     row.style.transform = `translateY(${item.start}px)`
 *     row.textContent = rows[item.index] ?? ''
 *     return row
 *   })
 *   spacer.replaceChildren(...rendered)
 * }
 *
 * const virtualizer = createVirtualizer(scrollElement, {
 *   count: rows.length,
 *   estimateSize: () => 48, // px per row (use measureElement for variable heights)
 *   overscan: 5,
 *   onChange: render, // pass it HERE — it re-renders as the user scrolls
 *   enabled: false, // create disabled, then enable: see the TanStack note in @remarks
 * })
 * virtualizer.setOptions({ enabled: true })
 * render(virtualizer) // first paint: 'Row 1' … 'Row 15' (10 visible + 5 overscan)
 * // On unmount: virtualizer.destroy()
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
 *   scrolls — pass `onChange` in the INITIAL options (the TanStack bond cannot
 *   attach one later via `setOptions`) or the visible window never updates.
 * - **TanStack bond: create the virtualizer with `enabled: false`, then call
 *   `setOptions({ enabled: true })`.** When the container already has a height, the
 *   bond fires `onChange` DURING `createVirtualizer()` and crashes with
 *   `Cannot access 'instance' before initialization`; enabling afterwards defers
 *   that first notification until the instance exists.
 * - A container whose height is `0` (not yet in the DOM, or no constrained
 *   height) yields only the overscan rows — size and mount it before creating
 *   the virtualizer. `estimateSize`/`start`/`size` are pixels.
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
