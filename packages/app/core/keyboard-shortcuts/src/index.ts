/**
 * Keyboard shortcuts core interface for molecule.dev.
 *
 * Provides a standardized API for registering and managing keyboard
 * shortcuts across the application. Bond a provider
 * (e.g. `@molecule/app-keyboard-shortcuts-hotkeys`) to supply
 * the concrete implementation.
 *
 * @module
 *
 * @example
 * ```typescript
 * import { requireProvider } from '@molecule/app-keyboard-shortcuts'
 *
 * const shortcuts = requireProvider()
 * const unregister = shortcuts.register({
 *   keys: 'ctrl+s',
 *   handler: (e) => { e.preventDefault(); save() },
 *   description: 'Save document',
 * })
 * ```
 */

export * from './provider.js'
export * from './types.js'
