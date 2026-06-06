/**
 * Drag-handle reorderable list.
 *
 * Exports `<ReorderableList>` and `ReorderableItem` type.
 *
 * @example
 * ```tsx
 * import { ReorderableList } from '@molecule/app-reorderable-list-react'
 * import type { ReorderableItem } from '@molecule/app-reorderable-list-react'
 *
 * const [items, setItems] = useState<ReorderableItem<{ label: string }>[]>([
 *   { id: '1', data: { label: 'First' } },
 *   { id: '2', data: { label: 'Second' } },
 *   { id: '3', data: { label: 'Third' } },
 * ])
 *
 * <ReorderableList
 *   items={items}
 *   onReorder={setItems}
 *   renderItem={(item) => <span>{item.data.label}</span>}
 * />
 * ```
 * @module
 */

export * from './ReorderableList.js'
