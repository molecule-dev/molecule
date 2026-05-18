import type { FileCardTranslations } from './types.js'

/** FileCard translations for zh. */
export const zh: Partial<FileCardTranslations> = {
  'file-card.kind.document': '文档',
  'file-card.kind.archive': '归档',
  'file-card.kind.folder': '文件夹',
  'file-card.kind.other': '文件',
  'file-card.modified.just-now': '刚刚',
  'file-card.modified.minute-other': '{{count}} 分钟前',
  'file-card.kind.image': '图像文件',
  'file-card.kind.video': '视频文件',
  'file-card.kind.audio': '音频文件',
  'file-card.kind.code': '代码文件',
  'file-card.aria.root': '{{姓名}} ，<x> {{种类}}</x>',
  'file-card.aria.size': '尺寸{{尺寸}}',
  'file-card.aria.modified': '修改的{{什么时候}}',
  'file-card.modified.minute-one': '1分钟前',
  'file-card.modified.hour-one': '1小时前',
  'file-card.modified.hour-other': '{{数数}}一小时前',
  'file-card.modified.day-one': '昨天',
  'file-card.modified.day-other': '{{数数}}几天前',
  'file-card.modified.week-one': '一周前',
  'file-card.modified.week-other': '{{数数}}一周前',
  'file-card.modified.month-one': '1个月前',
  'file-card.modified.month-other': '{{数数}}一个月前',
}
