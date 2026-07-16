/**
 * dnd-kit-style drag-drop provider for molecule.dev.
 *
 * Implements `DragDropProvider` from `@molecule/app-drag-drop` as a
 * HEADLESS state layer modeled on dnd-kit's concepts (sortable/draggable/
 * droppable) — it does NOT depend on or load `@dnd-kit/*`; your UI attaches
 * its own pointer/drag listeners and drives the instances (the `_`-prefixed
 * instance methods exist for that wiring).
 *
 * @example
 * ```typescript
 * import { provider } from '@molecule/app-drag-drop-dndkit'
 * import { setProvider } from '@molecule/app-drag-drop'
 *
 * setProvider(provider)
 * ```
 *
 * @remarks
 * The `DndKitConfig` knobs (`activationDelay`, `activationDistance`,
 * `cancelOnEscape`) are currently NOT implemented — activation thresholds
 * and Escape-to-cancel belong in your event-wiring layer. Reorders ignore
 * out-of-range indices and are suppressed while `disabled`; a droppable
 * with no `accept` list accepts every type.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
