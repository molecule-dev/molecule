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
  'file-card.aria.root': '{{Name}} ,<x> {{Art}}</x>',
  'file-card.aria.size': 'Größe<x> {{Größe}}</x>',
  'file-card.aria.modified': 'Modifiziert<x> {{Wann}}</x>',
  'file-card.modified.minute-one': 'vor 1 Minute',
  'file-card.modified.hour-one': 'vor 1 Stunde',
  'file-card.modified.hour-other': '{{zählen}} vor einer Stunde',
  'file-card.modified.day-one': 'gestern',
  'file-card.modified.day-other': '{{zählen}} vor Tagen',
  'file-card.modified.week-one': 'vor 1 Woche',
  'file-card.modified.week-other': '{{zählen}} vor einer Woche',
  'file-card.modified.month-one': 'vor 1 Monat',
  'file-card.modified.month-other': '{{zählen}} vor einem Monat',
}
