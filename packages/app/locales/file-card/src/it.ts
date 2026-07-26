import type { FileCardTranslations } from './types.js'

/** FileCard translations for it. */
export const it: Partial<FileCardTranslations> = {
  'file-card.kind.document': 'Documento',
  'file-card.kind.archive': 'Archivia',
  'file-card.kind.folder': 'Cartella',
  'file-card.modified.just-now': 'ora',
  'file-card.modified.minute-other': '{{count}} min fa',
  'file-card.kind.image': 'File immagine',
  'file-card.kind.video': 'file video',
  'file-card.kind.audio': 'File audio',
  'file-card.kind.code': 'File del codice',
  'file-card.kind.other': 'File',
  'file-card.aria.root': '{{name}} , {{kind}}',
  'file-card.aria.size': 'Misurare {{size}}',
  'file-card.aria.modified': 'Modificato {{when}}',
  'file-card.modified.minute-one': '1 minuto fa',
  'file-card.modified.hour-one': '1 ora fa',
  'file-card.modified.hour-other': "{{count}} un'ora fa",
  'file-card.modified.day-one': 'Ieri',
  'file-card.modified.day-other': '{{count}} giorni fa',
  'file-card.modified.week-one': '1 settimana fa',
  'file-card.modified.week-other': '{{count}} una settimana fa',
  'file-card.modified.month-one': '1 mese fa',
  'file-card.modified.month-other': '{{count}} mo fa',
}
