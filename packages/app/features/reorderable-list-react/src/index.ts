/**
 * Drag-handle reorderable list for React DOM and React Native.
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
 * and Alt+ArrowUp / Alt+ArrowDown on a focused move button reorders its row.
 * Focus follows the item: a move that disables the used button (the item
 * reached the top or the bottom) moves focus to the same row's other button.
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 *
 * import { ReorderableList } from '@molecule/app-reorderable-list-react'
 * import type { ReorderableItem } from '@molecule/app-reorderable-list-react'
 * import { Text } from '@molecule/app-ui-react/elements'
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
 *       renderItem={(item) => <Text as="span">{item.data.label}</Text>}
 *     />
 *   )
 * }
 * ```
 *
 * @remarks
 * - React DOM uses HTML5 drag and drop. React Native uses the renderer supplied
 *   by `DragDropRendererProvider`. Move buttons are available on both renderers.
 * - Requires a bonded ClassMap (`setClassMap()` at startup) and an
 *   `<I18nProvider>` (for the control labels) or rendering throws.
 * - Item `id`s must be unique — drop resolution matches by id.
 * - Control labels ("Move up/down", "Drag to reorder", row position) render
 *   through `t(...)` under `reorderableList.*`, translated by the
 *   `@molecule/app-locales-reorderable-list` companion bond.
 *
 * @module
 */

export * from './ReorderableList.js'
