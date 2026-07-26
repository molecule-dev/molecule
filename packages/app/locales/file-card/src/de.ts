import type { FileCardTranslations } from './types.js'

/** FileCard translations for de. */
export const de: Partial<FileCardTranslations> = {
  'file-card.kind.document': 'Dokument',
  'file-card.kind.archive': 'Archivieren',
  'file-card.kind.folder': 'Ordner',
  'file-card.kind.other': 'Datei',
  'file-card.modified.just-now': 'gerade eben',
  'file-card.modified.minute-other': 'vor {{count}} Min',
  'file-card.kind.image': 'Bilddatei',
  'file-card.kind.video': 'Videodatei',
  'file-card.kind.audio': 'Audiodatei',
  'file-card.kind.code': 'Code-Datei',
  'file-card.aria.root': '{{name}} , {{kind}}',
  'file-card.aria.size': 'Größe {{size}}',
  'file-card.aria.modified': 'Modifiziert {{when}}',
  'file-card.modified.minute-one': 'vor 1 Minute',
  'file-card.modified.hour-one': 'vor 1 Stunde',
  'file-card.modified.hour-other': '{{count}} vor einer Stunde',
  'file-card.modified.day-one': 'gestern',
  'file-card.modified.day-other': '{{count}} vor Tagen',
  'file-card.modified.week-one': 'vor 1 Woche',
  'file-card.modified.week-other': '{{count}} vor einer Woche',
  'file-card.modified.month-one': 'vor 1 Monat',
  'file-card.modified.month-other': '{{count}} vor einem Monat',
}
