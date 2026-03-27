/**
 * dnd-kit drag-drop provider for molecule.dev.
 *
 * Implements `DragDropProvider` from `@molecule/app-drag-drop` using a
 * dnd-kit-compatible state management layer. Framework bindings wire these
 * instances to `@dnd-kit/core` (React), `@dnd-kit/vue`, or equivalent
 * libraries for actual DOM interactions.
 *
 * @example
 * ```typescript
 * import { provider } from '@molecule/app-drag-drop-dndkit'
 * import { setProvider } from '@molecule/app-drag-drop'
 *
 * setProvider(provider)
 * ```
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
