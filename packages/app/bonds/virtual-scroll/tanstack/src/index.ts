/**
 * TanStack Virtual provider for the molecule virtual scroll interface.
 *
 * Implements `VirtualScrollProvider` from `@molecule/app-virtual-scroll` using
 * `@tanstack/virtual-core` for headless virtual/infinite scrolling.
 *
 * @example
 * ```typescript
 * import { getClassMap, setClassMap } from '@molecule/app-ui'
 * import { classMap } from '@molecule/app-ui-tailwind'
 * import { createVirtualizer, setProvider } from '@molecule/app-virtual-scroll'
 * import type { VirtualScrollInstance } from '@molecule/app-virtual-scroll'
 * import { createTanStackProvider } from '@molecule/app-virtual-scroll-tanstack'
 *
 * // Startup (bonds.ts): bond once, before the first createVirtualizer().
 * setClassMap(classMap)
 * setProvider(createTanStackProvider({ isScrollingResetDelay: 150 }))
 *
 * const rows = Array.from({ length: 5_000 }, (_, i) => `Message ${i + 1}`)
 * const cm = getClassMap()
 *
 * // Scroll container with a constrained height, mounted BEFORE creating the virtualizer.
 * const scrollElement = document.createElement('div')
 * scrollElement.style.height = '400px'
 * scrollElement.style.overflowY = 'auto'
 * const spacer = document.createElement('div')
 * spacer.className = cm.position('relative')
 * scrollElement.append(spacer)
 * document.body.append(scrollElement)
 *
 * // Render ONLY the visible window; use the instance passed in, not an outer variable.
 * const render = (virtualizer: VirtualScrollInstance): void => {
 *   spacer.style.height = `${virtualizer.getTotalSize()}px`
 *   spacer.replaceChildren(
 *     ...virtualizer.getVirtualItems().map((item) => {
 *       const row = document.createElement('div')
 *       row.className = cm.cn(cm.position('absolute'), cm.w('full'))
 *       row.style.transform = `translateY(${item.start}px)`
 *       row.textContent = rows[item.index] ?? ''
 *       return row
 *     }),
 *   )
 * }
 *
 * // onChange fires once as soon as the virtualizer exists (first paint), then on every scroll.
 * const virtualizer = createVirtualizer(scrollElement, {
 *   count: rows.length,
 *   estimateSize: () => 40, // px
 *   overscan: 3,
 *   onChange: render,
 * })
 * // spacer now holds 'Message 1' … 'Message 13' (10 visible + 3 overscan)
 * virtualizer.scrollToIndex(2_500, { align: 'start' })
 * // On unmount: virtualizer.destroy()
 * ```
 *
 * @remarks
 * - The factory is `createTanStackProvider(config)` (or the ready-made `provider`
 *   export) — there is NO `createProvider`. Bond it with `setProvider(...)` from
 *   `@molecule/app-virtual-scroll`; `createVirtualizer()` throws until you do.
 * - Provide `onChange` in the INITIAL options — `setOptions()` cannot attach
 *   one after creation (the callback is wired only at `createVirtualizer` time).
 * - When the container already has a height, the first `onChange` fires
 *   synchronously INSIDE `createVirtualizer()` (after the instance exists, before
 *   it returns). Render from the `instance` argument — an `onChange` that reads
 *   the `const virtualizer = createVirtualizer(...)` variable hits its temporal
 *   dead zone. No `enabled: false` workaround is needed.
 * - HEADLESS: it only computes geometry (px). A container with `0` height (not
 *   mounted, no constrained height) yields just the overscan rows. `config`
 *   holds TanStack-only knobs (`debug`, `isScrollingResetDelay` in ms,
 *   `useScrollendEvent`); everything else goes in the core options.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
