import type { DragDropDndkitTranslations } from './types.js'

/** DragDropDndkit translations for English. */
export const en: DragDropDndkitTranslations = {
  'dragDrop.sortable.instructions':
    'To pick up an item, press Space or Enter. While dragging, use the arrow keys to move it. Press Space or Enter again to drop it in its new position, or Escape to cancel.',
  'dragDrop.sortable.pickedUp': 'Picked up {{label}}, position {{position}} of {{total}}.',
  'dragDrop.sortable.movedOver': '{{label}} is over position {{position}} of {{total}}.',
  'dragDrop.sortable.cancelled':
    'Reordering cancelled. {{label}} is back at position {{position}} of {{total}}.',
  'dragDrop.sortable.dropped': 'Dropped {{label}} at position {{position}} of {{total}}.',
  'dragDrop.sortable.roleDescription': 'sortable',
}
