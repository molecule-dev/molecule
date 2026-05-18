import type { FileCardTranslations } from './types.js'

/** FileCard translations for mk. */
export const mk: Partial<FileCardTranslations> = {
  'file-card.modified.just-now': 'токму сега',
  'file-card.kind.image': 'Датотека со слика',
  'file-card.kind.video': 'Видео датотека',
  'file-card.kind.audio': 'Аудио датотека',
  'file-card.kind.document': 'Документ',
  'file-card.kind.archive': 'Архива',
  'file-card.kind.code': 'Датотека со код',
  'file-card.kind.folder': 'Папка',
  'file-card.kind.other': 'Датотека',
  'file-card.aria.root': '{{име}} ,<x> {{вид}}</x>',
  'file-card.aria.size': 'Големина<x> {{големина}}</x>',
  'file-card.aria.modified': 'Изменето<x> {{кога}}</x>',
  'file-card.modified.minute-one': 'Пред 1 минута',
  'file-card.modified.minute-other': '{{count}} пред мин',
  'file-card.modified.hour-one': 'пред 1 час',
  'file-card.modified.hour-other': '{{count}} пред еден час',
  'file-card.modified.day-one': 'вчера',
  'file-card.modified.day-other': '{{count}} пред неколку дена',
  'file-card.modified.week-one': 'Пред 1 недела',
  'file-card.modified.week-other': '{{count}} пред една недела',
  'file-card.modified.month-one': 'пред 1 месец',
  'file-card.modified.month-other': '{{count}} пред еден месец',
}
