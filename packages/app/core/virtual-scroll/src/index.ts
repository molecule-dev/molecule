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
 * @module
 */

export * from './provider.js'
export * from './types.js'
