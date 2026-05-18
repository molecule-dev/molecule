import type { FileCardTranslations } from './types.js'

/** FileCard translations for sv. */
export const sv: Partial<FileCardTranslations> = {
  'file-card.kind.document': 'Dokument',
  'file-card.kind.archive': 'Arkivera',
  'file-card.kind.folder': 'Mapp',
  'file-card.kind.other': 'Fil',
  'file-card.modified.just-now': 'just nu',
  'file-card.modified.minute-other': '{{count}} min sedan',
  'file-card.kind.image': 'Bildfil',
  'file-card.kind.video': 'Videofil',
  'file-card.kind.audio': 'Ljudfil',
  'file-card.kind.code': 'Kodfil',
  'file-card.aria.root': '{{namn}} ,<x> {{slag}}</x>',
  'file-card.aria.size': 'Storlek<x> {{storlek}}</x>',
  'file-card.aria.modified': 'Ändrad<x> {{när}}</x>',
  'file-card.modified.minute-one': 'För 1 minut sedan',
  'file-card.modified.hour-one': 'För 1 timme sedan',
  'file-card.modified.hour-other': '{{räkna}} för en timme sedan',
  'file-card.modified.day-one': 'i går',
  'file-card.modified.day-other': '{{räkna}} dagar sedan',
  'file-card.modified.week-one': '1 vecka sedan',
  'file-card.modified.week-other': '{{räkna}} vecka sedan',
  'file-card.modified.month-one': 'För 1 månad sedan',
  'file-card.modified.month-other': '{{räkna}} mån sedan',
}
