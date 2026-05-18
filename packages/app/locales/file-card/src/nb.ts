import type { FileCardTranslations } from './types.js'

/** FileCard translations for nb. */
export const nb: Partial<FileCardTranslations> = {
  'file-card.kind.document': 'Dokument',
  'file-card.kind.archive': 'Arkiver',
  'file-card.kind.other': 'Fil',
  'file-card.modified.just-now': 'akkurat nå',
  'file-card.modified.minute-other': '{{count}} min siden',
  'file-card.kind.image': 'Bildefil',
  'file-card.kind.video': 'Videofil',
  'file-card.kind.audio': 'Lydfil',
  'file-card.kind.code': 'Kodefil',
  'file-card.kind.folder': 'Mappe',
  'file-card.aria.root': '{{navn}} ,<x> {{type}}</x>',
  'file-card.aria.size': 'Størrelse<x> {{størrelse}}</x>',
  'file-card.aria.modified': 'Modifisert<x> {{når}}</x>',
  'file-card.modified.minute-one': 'For 1 minutt siden',
  'file-card.modified.hour-one': 'For 1 time siden',
  'file-card.modified.hour-other': '{{telle}} for en time siden',
  'file-card.modified.day-one': 'i går',
  'file-card.modified.day-other': '{{telle}} dager siden',
  'file-card.modified.week-one': 'For 1 uke siden',
  'file-card.modified.week-other': '{{telle}} for en uke siden',
  'file-card.modified.month-one': 'For 1 mnd siden',
  'file-card.modified.month-other': '{{telle}} for mnd siden',
}
