import type { DragDropDndkitTranslations } from './types.js'

/** DragDropDndkit translations for zh-TW. */
export const zhTW: DragDropDndkitTranslations = {
  'dragDrop.sortable.instructions':
    '若要拾起項目，請按空格鍵或 Enter。拖曳時，使用方向鍵移動它。再按一次空格鍵或 Enter 將其放到新位置，或按 Escape 取消。',
  'dragDrop.sortable.pickedUp': '已拾起{{label}}，第{{position}}項（共{{total}}項）。',
  'dragDrop.sortable.movedOver': '{{label}}位於第{{position}}項（共{{total}}項）上方。',
  'dragDrop.sortable.cancelled': '已取消重新排序。{{label}}回到第{{position}}項（共{{total}}項）。',
  'dragDrop.sortable.dropped': '已將{{label}}放到第{{position}}項（共{{total}}項）。',
  'dragDrop.sortable.roleDescription': '可排序',
}
