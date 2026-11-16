import type { DragDropDndkitTranslations } from './types.js'

/** DragDropDndkit translations for zh. */
export const zh: DragDropDndkitTranslations = {
  'dragDrop.sortable.instructions':
    '要拾起项目，请按空格键或 Enter。拖动时，使用方向键移动它。再次按空格键或 Enter 将其放到新位置，或按 Escape 取消。',
  'dragDrop.sortable.pickedUp': '已拾起{{label}}，第{{position}}项（共{{total}}项）。',
  'dragDrop.sortable.movedOver': '{{label}}位于第{{position}}项（共{{total}}项）上方。',
  'dragDrop.sortable.cancelled': '已取消重新排序。{{label}}回到第{{position}}项（共{{total}}项）。',
  'dragDrop.sortable.dropped': '已将{{label}}放到第{{position}}项（共{{total}}项）。',
  'dragDrop.sortable.roleDescription': '可排序',
}
