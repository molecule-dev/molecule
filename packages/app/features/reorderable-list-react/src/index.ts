/**
 * Drag-handle reorderable list (HTML5 drag-and-drop).
 *
 * Exports `<ReorderableList>` and the `ReorderableItem<T>` type
 * (`{ id: string; data: T }`). Fully controlled: it renders rows and calls
 * `onReorder(next)` with the complete reordered array — the app owns state.
 * Props: `items`, `onReorder`, `renderItem(item, isDragging)`,
 * `renderHandle?` (when set, only the handle is draggable — e.g. a "≡"
 * glyph; otherwise the whole row drags), `className?`.
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 *
 * import { ReorderableList } from '@molecule/app-reorderable-list-react'
 * import type { ReorderableItem } from '@molecule/app-reorderable-list-react'
 *
 * function Steps() {
 *   const [items, setItems] = useState<ReorderableItem<{ label: string }>[]>([
 *     { id: '1', data: { label: 'First' } },
 *     { id: '2', data: { label: 'Second' } },
 *     { id: '3', data: { label: 'Third' } },
 *   ])
 *   return (
 *     <ReorderableList
 *       items={items}
 *       onReorder={setItems}
 *       renderItem={(item) => <span>{item.data.label}</span>}
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * - Native HTML5 drag events: works with MOUSE/POINTER ONLY. Touch devices
 *   (iOS/Android) fire no HTML5 drag events, and there is no keyboard
 *   reordering — add explicit up/down buttons (or a touch-capable drag
 *   library) when mobile or a11y reordering is required.
 * - Requires a bonded ClassMap (`setClassMap()` at startup) or rendering
 *   throws.
 * - Item `id`s must be unique — drop resolution matches by id.
 * - The handle's "Drag to reorder" aria-label is hardcoded English.
 *
 * @module
 */

export * from './ReorderableList.js'
