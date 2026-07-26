import type { FileCardTranslations } from './types.js'

/** FileCard translations for fr. */
export const fr: Partial<FileCardTranslations> = {
  'file-card.kind.archive': 'Archiver',
  'file-card.kind.folder': 'Dossier',
  'file-card.kind.other': 'Fichier',
  'file-card.modified.minute-other': 'il y a {{count}} min',
  'file-card.kind.image': 'fichier image',
  'file-card.kind.video': 'fichier vidéo',
  'file-card.kind.audio': 'fichier audio',
  'file-card.kind.document': 'Document',
  'file-card.kind.code': 'fichier de code',
  'file-card.aria.root': '{{name}} , {{kind}}',
  'file-card.aria.size': 'Taille {{size}}',
  'file-card.aria.modified': 'Modifié {{when}}',
  'file-card.modified.just-now': "tout à l' heure",
  'file-card.modified.minute-one': 'il y a 1 minute',
  'file-card.modified.hour-one': 'Il y a 1 heure',
  'file-card.modified.hour-other': '{{count}} il y a une heure',
  'file-card.modified.day-one': 'hier',
  'file-card.modified.day-other': '{{count}} il y a quelques jours',
  'file-card.modified.week-one': 'Il y a une semaine',
  'file-card.modified.week-other': '{{count}} il y a une semaine',
  'file-card.modified.month-one': 'il y a 1 mois',
  'file-card.modified.month-other': '{{count}} il y a un mois',
}
