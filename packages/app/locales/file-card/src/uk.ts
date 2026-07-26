import type { FileCardTranslations } from './types.js'

/** FileCard translations for uk. */
export const uk: Partial<FileCardTranslations> = {
  'file-card.kind.document': 'Документ',
  'file-card.kind.archive': 'Архівувати',
  'file-card.kind.other': 'Файл',
  'file-card.modified.just-now': 'щойно',
  'file-card.modified.minute-other': '{{count}} хв тому',
  'file-card.kind.image': 'Файл зображення',
  'file-card.kind.video': 'Відеофайл',
  'file-card.kind.audio': 'Аудіофайл',
  'file-card.kind.code': 'Файл коду',
  'file-card.kind.folder': 'Папка',
  'file-card.aria.root': '{{name}} , {{kind}}',
  'file-card.aria.size': 'Розмір {{size}}',
  'file-card.aria.modified': 'Змінено {{when}}',
  'file-card.modified.minute-one': '1 хвилину тому',
  'file-card.modified.hour-one': '1 годину тому',
  'file-card.modified.hour-other': '{{count}} год. тому',
  'file-card.modified.day-one': 'вчора',
  'file-card.modified.day-other': '{{count}} днів тому',
  'file-card.modified.week-one': '1 тиждень тому',
  'file-card.modified.week-other': '{{count}} тиждень тому',
  'file-card.modified.month-one': '1 місяць тому',
  'file-card.modified.month-other': '{{count}} місяць тому',
}
