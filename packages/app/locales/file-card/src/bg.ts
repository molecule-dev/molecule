import type { FileCardTranslations } from './types.js'

/** FileCard translations for bg. */
export const bg: Partial<FileCardTranslations> = {
  'file-card.modified.just-now': 'току-що',
  'file-card.kind.image': 'Файл с изображение',
  'file-card.kind.video': 'Видео файл',
  'file-card.kind.audio': 'Аудио файл',
  'file-card.kind.document': 'Документ',
  'file-card.kind.archive': 'Архив',
  'file-card.kind.code': 'Файл с код',
  'file-card.kind.folder': 'Папка',
  'file-card.kind.other': 'Файл',
  'file-card.aria.root': '{{name}} , {{kind}}',
  'file-card.aria.size': 'Размер {{size}}',
  'file-card.aria.modified': 'Модифицирано {{when}}',
  'file-card.modified.minute-one': 'преди 1 мин.',
  'file-card.modified.minute-other': '{{count}} преди мин.',
  'file-card.modified.hour-one': 'преди 1 час',
  'file-card.modified.hour-other': '{{count}} преди час',
  'file-card.modified.day-one': 'вчера',
  'file-card.modified.day-other': '{{count}} преди дни',
  'file-card.modified.week-one': 'преди 1 седмица',
  'file-card.modified.week-other': '{{count}} преди седмица',
  'file-card.modified.month-one': 'преди 1 месец',
  'file-card.modified.month-other': '{{count}} преди месец',
}
