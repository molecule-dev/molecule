import type { FileCardTranslations } from './types.js'

/** FileCard translations for cs. */
export const cs: Partial<FileCardTranslations> = {
  'file-card.kind.document': 'Dokument',
  'file-card.kind.archive': 'Archivovat',
  'file-card.kind.other': 'Soubor',
  'file-card.modified.just-now': 'právě teď',
  'file-card.modified.minute-other': 'před {{count}} min',
  'file-card.kind.image': 'Soubor obrázku',
  'file-card.kind.video': 'Videosoubor',
  'file-card.kind.audio': 'Zvukový soubor',
  'file-card.kind.code': 'Soubor s kódem',
  'file-card.kind.folder': 'Složka',
  'file-card.aria.root': '{{name}} , {{kind}}',
  'file-card.aria.size': 'Velikost {{size}}',
  'file-card.aria.modified': 'Upraveno {{when}}',
  'file-card.modified.minute-one': 'Před 1 minutou',
  'file-card.modified.hour-one': 'Před 1 hodinou',
  'file-card.modified.hour-other': '{{count}} před hodinou',
  'file-card.modified.day-one': 'včera',
  'file-card.modified.day-other': '{{count}} před několika dny',
  'file-card.modified.week-one': 'Před 1 týdnem',
  'file-card.modified.week-other': '{{count}} před týdnem',
  'file-card.modified.month-one': 'Před 1 měsícem',
  'file-card.modified.month-other': '{{count}} před měsícem',
}
