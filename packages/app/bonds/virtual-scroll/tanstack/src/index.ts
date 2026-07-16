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
 * @remarks
 * Provide `onChange` in the INITIAL options — `setOptions()` cannot attach
 * one after creation (the callback is wired only at `createVirtualizer` time).
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
