/**
 * Default kanban provider for molecule.dev.
 *
 * Provides an in-memory kanban board implementation with column/card CRUD,
 * drag state tracking, column reordering, and subscription-based state
 * notifications. No external dependencies.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/app-kanban'
 * import { provider } from '@molecule/app-kanban-default'
 *
 * setProvider(provider)
 * ```
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
