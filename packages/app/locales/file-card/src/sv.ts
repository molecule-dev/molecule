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
  'file-card.aria.root': '{{name}} , {{kind}}',
  'file-card.aria.size': 'Storlek {{size}}',
  'file-card.aria.modified': 'Ändrad {{when}}',
  'file-card.modified.minute-one': 'För 1 minut sedan',
  'file-card.modified.hour-one': 'För 1 timme sedan',
  'file-card.modified.hour-other': '{{count}} för en timme sedan',
  'file-card.modified.day-one': 'i går',
  'file-card.modified.day-other': '{{count}} dagar sedan',
  'file-card.modified.week-one': '1 vecka sedan',
  'file-card.modified.week-other': '{{count}} vecka sedan',
  'file-card.modified.month-one': 'För 1 månad sedan',
  'file-card.modified.month-other': '{{count}} mån sedan',
}
