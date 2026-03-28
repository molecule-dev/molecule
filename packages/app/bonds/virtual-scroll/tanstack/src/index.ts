/**
 * TanStack Virtual provider for the molecule virtual scroll interface.
 *
 * Implements `VirtualScrollProvider` from `@molecule/app-virtual-scroll` using
 * `@tanstack/virtual-core` for headless virtual/infinite scrolling.
 *
 * @example
 * ```typescript
 * import { provider } from '@molecule/app-virtual-scroll-tanstack'
 * import { setProvider } from '@molecule/app-virtual-scroll'
 *
 * setProvider(provider)
 * ```
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
