/**
 * hotkeys-js provider for \@molecule/app-keyboard-shortcuts.
 *
 * Provides an in-memory keyboard shortcut registry conforming to
 * the molecule keyboard shortcuts provider interface.
 *
 * @module
 *
 * @example
 * ```typescript
 * import { provider } from '@molecule/app-keyboard-shortcuts-hotkeys'
 * import { setProvider } from '@molecule/app-keyboard-shortcuts'
 *
 * setProvider(provider)
 * ```
 */

export * from './provider.js'
export * from './types.js'
