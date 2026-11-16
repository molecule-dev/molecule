/** Translation keys for the drag-drop-dndkit locale package. */
export type DragDropDndkitTranslationKey =
  | 'dragDrop.sortable.instructions'
  | 'dragDrop.sortable.pickedUp'
  | 'dragDrop.sortable.movedOver'
  | 'dragDrop.sortable.cancelled'
  | 'dragDrop.sortable.dropped'
  | 'dragDrop.sortable.roleDescription'

/** Translation record mapping `@molecule/app-drag-drop-dndkit` keys to translated strings. */
export type DragDropDndkitTranslations = Record<DragDropDndkitTranslationKey, string>
