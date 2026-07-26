import type { FileCardTranslations } from './types.js'

/** FileCard translations for hu. */
export const hu: Partial<FileCardTranslations> = {
  'file-card.kind.document': 'Dokumentum',
  'file-card.kind.archive': 'Archiválás',
  'file-card.kind.other': 'Fájl',
  'file-card.modified.just-now': 'épp most',
  'file-card.modified.minute-other': '{{count}} perc ezelőtt',
  'file-card.kind.image': 'Képfájl',
  'file-card.kind.video': 'Videofájl',
  'file-card.kind.audio': 'Hangfájl',
  'file-card.kind.code': 'Kódfájl',
  'file-card.kind.folder': 'Mappa',
  'file-card.aria.root': '{{name}} , {{kind}}',
  'file-card.aria.size': 'Méret {{size}}',
  'file-card.aria.modified': 'Módosított {{when}}',
  'file-card.modified.minute-one': '1 perccel ezelőtt',
  'file-card.modified.hour-one': '1 órája',
  'file-card.modified.hour-other': '{{count}} órával ezelőtt',
  'file-card.modified.day-one': 'tegnap',
  'file-card.modified.day-other': '{{count}} napokkal ezelőtt',
  'file-card.modified.week-one': '1 héttel ezelőtt',
  'file-card.modified.week-other': '{{count}} héttel ezelőtt',
  'file-card.modified.month-one': '1 hónappal ezelőtt',
  'file-card.modified.month-other': '{{count}} hónappal ezelőtt',
}
