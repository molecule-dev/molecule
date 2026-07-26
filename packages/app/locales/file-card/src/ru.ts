import type { FileCardTranslations } from './types.js'

/** FileCard translations for ru. */
export const ru: Partial<FileCardTranslations> = {
  'file-card.modified.just-now': 'только что',
  'file-card.kind.image': 'Файл изображения',
  'file-card.kind.video': 'Видеофайл',
  'file-card.kind.audio': 'Аудиофайл',
  'file-card.kind.document': 'Документ',
  'file-card.kind.archive': 'Архив',
  'file-card.kind.code': 'Файл кода',
  'file-card.kind.folder': 'Папка',
  'file-card.kind.other': 'Файл',
  'file-card.aria.root': '{{name}} , {{kind}}',
  'file-card.aria.size': 'Размер {{size}}',
  'file-card.aria.modified': 'Модифицированный {{when}}',
  'file-card.modified.minute-one': '1 минуту назад',
  'file-card.modified.minute-other': '{{count}} мин назад',
  'file-card.modified.hour-one': '1 час назад',
  'file-card.modified.hour-other': '{{count}} час назад',
  'file-card.modified.day-one': 'вчера',
  'file-card.modified.day-other': '{{count}} несколько дней назад',
  'file-card.modified.week-one': '1 неделю назад',
  'file-card.modified.week-other': '{{count}} неделю назад',
  'file-card.modified.month-one': '1 месяц назад',
  'file-card.modified.month-other': '{{count}} м аг',
}
