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
 * Reordering works with a mouse (HTML5 drag) AND the keyboard: every row has
 * move-up/move-down buttons (`data-mol-id="reorderable-move-{up,down}-<id>"`),
 * and a focused row responds to Alt+ArrowUp / Alt+ArrowDown.
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
 * - Native HTML5 drag works with MOUSE/POINTER only — touch devices
 *   (iOS/Android) fire no HTML5 drag events. The keyboard path (move buttons +
 *   Alt+Arrow) is the a11y/touch-safe fallback and is always present; add a
 *   pointer/touch drag library only if you also need touch DRAG specifically.
 * - Requires a bonded ClassMap (`setClassMap()` at startup) and an
 *   `<I18nProvider>` (for the control labels) or rendering throws.
 * - Item `id`s must be unique — drop resolution matches by id.
 * - Control labels ("Move up/down", "Drag to reorder", row position) render
 *   through `t(...)` with English defaults; no companion locale bond ships yet,
 *   so translate them by wiring a `reorderableList.*` bond when needed.
 *
 * @module
 */

export * from './ReorderableList.js'
