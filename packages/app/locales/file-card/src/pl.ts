import type { FileCardTranslations } from './types.js'

/** FileCard translations for pl. */
export const pl: Partial<FileCardTranslations> = {
  'file-card.kind.document': 'Dokument',
  'file-card.kind.archive': 'Archiwizuj',
  'file-card.kind.other': 'Plik',
  'file-card.modified.just-now': 'przed chwilą',
  'file-card.modified.minute-other': '{{count}} min temu',
  'file-card.kind.image': 'Plik obrazu',
  'file-card.kind.video': 'Plik wideo',
  'file-card.kind.audio': 'Plik audio',
  'file-card.kind.code': 'Plik kodu',
  'file-card.kind.folder': 'Falcówka',
  'file-card.aria.root': '{{name}} , {{kind}}',
  'file-card.aria.size': 'Rozmiar {{size}}',
  'file-card.aria.modified': 'Zmodyfikowany {{when}}',
  'file-card.modified.minute-one': '1 minutę temu',
  'file-card.modified.hour-one': '1 godz. temu',
  'file-card.modified.hour-other': '{{count}} godz. temu',
  'file-card.modified.day-one': 'Wczoraj',
  'file-card.modified.day-other': '{{count}} dni temu',
  'file-card.modified.week-one': '1 tydzień temu',
  'file-card.modified.week-other': '{{count}} tydz. temu',
  'file-card.modified.month-one': '1 miesiąc temu',
  'file-card.modified.month-other': '{{count}} mies. temu',
}
