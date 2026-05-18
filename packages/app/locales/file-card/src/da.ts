import type { FileCardTranslations } from './types.js'

/** FileCard translations for da. */
export const da: Partial<FileCardTranslations> = {
  'file-card.kind.document': 'Dokument',
  'file-card.kind.archive': 'Arkivér',
  'file-card.kind.other': 'Fil',
  'file-card.modified.just-now': 'lige nu',
  'file-card.modified.minute-other': '{{count}} min siden',
  'file-card.kind.image': 'Billedfil',
  'file-card.kind.video': 'Videofil',
  'file-card.kind.audio': 'Lydfil',
  'file-card.kind.code': 'Kodefil',
  'file-card.kind.folder': 'Folder',
  'file-card.aria.root': '{{navn}} ,<x> {{slags}}</x>',
  'file-card.aria.size': 'Størrelse<x> {{størrelse}}</x>',
  'file-card.aria.modified': 'Ændret<x> {{når}}</x>',
  'file-card.modified.minute-one': 'For 1 minut siden',
  'file-card.modified.hour-one': 'For 1 time siden',
  'file-card.modified.hour-other': '{{tælle}} for en time siden',
  'file-card.modified.day-one': 'i går',
  'file-card.modified.day-other': '{{tælle}} dage siden',
  'file-card.modified.week-one': 'For 1 uge siden',
  'file-card.modified.week-other': '{{tælle}} for en uge siden',
  'file-card.modified.month-one': 'For 1 måned siden',
  'file-card.modified.month-other': '{{tælle}} måned siden',
}
