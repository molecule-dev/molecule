/**
 * cmdk command palette provider for molecule.dev.
 *
 * Implements `CommandPaletteProvider` from `@molecule/app-command-palette` using
 * a cmdk-style headless state management approach. Framework bindings
 * connect the headless state to the actual cmdk DOM library.
 *
 * @example
 * ```typescript
 * import { provider } from '@molecule/app-command-palette-cmdk'
 * import { setProvider } from '@molecule/app-command-palette'
 *
 * setProvider(provider)
 * ```
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
