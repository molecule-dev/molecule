import type { FileCardTranslations } from './types.js'

/** FileCard translations for sr. */
export const sr: Partial<FileCardTranslations> = {
  'file-card.modified.just-now': 'управо',
  'file-card.kind.image': 'Датотека слике',
  'file-card.kind.video': 'Видео датотека',
  'file-card.kind.audio': 'Аудио датотека',
  'file-card.kind.document': 'Документ',
  'file-card.kind.archive': 'Архива',
  'file-card.kind.code': 'Датотека кода',
  'file-card.kind.folder': 'Фасцикла',
  'file-card.kind.other': 'Датотека',
  'file-card.aria.root': '{{name}} , {{kind}}',
  'file-card.aria.size': 'Величина {{size}}',
  'file-card.aria.modified': 'Измењено {{when}}',
  'file-card.modified.minute-one': 'Пре 1 мин',
  'file-card.modified.minute-other': '{{count}} пре мин',
  'file-card.modified.hour-one': 'Пре 1 сат',
  'file-card.modified.hour-other': '{{count}} пре сат',
  'file-card.modified.day-one': 'јуче',
  'file-card.modified.day-other': '{{count}} пре неколико дана',
  'file-card.modified.week-one': 'Пре 1 недеље',
  'file-card.modified.week-other': '{{count}} пре недељу дана',
  'file-card.modified.month-one': 'Пре 1 месец',
  'file-card.modified.month-other': '{{count}} пре месец дана',
}
