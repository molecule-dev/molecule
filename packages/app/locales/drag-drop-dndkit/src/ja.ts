import type { DragDropDndkitTranslations } from './types.js'

/** DragDropDndkit translations for ja. */
export const ja: DragDropDndkitTranslations = {
  'dragDrop.sortable.instructions':
    '項目を持ち上げるには、スペースキーまたはEnterキーを押してください。ドラッグ中は矢印キーで移動できます。新しい位置に置くにはもう一度スペースキーまたはEnterキーを押し、キャンセルするにはEscapeキーを押してください。',
  'dragDrop.sortable.pickedUp':
    '{{label}}を持ち上げました。{{total}}個中{{position}}番目の位置です。',
  'dragDrop.sortable.movedOver': '{{label}}は{{total}}個中{{position}}番目の位置の上にあります。',
  'dragDrop.sortable.cancelled':
    '並べ替えを取り消しました。{{label}}は{{total}}個中{{position}}番目の位置に戻りました。',
  'dragDrop.sortable.dropped': '{{label}}を{{total}}個中{{position}}番目の位置に置きました。',
  'dragDrop.sortable.roleDescription': '並べ替え可能',
}
