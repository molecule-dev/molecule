import type { FileCardTranslations } from './types.js'

/** FileCard translations for es. */
export const es: Partial<FileCardTranslations> = {
  'file-card.kind.document': 'Documento',
  'file-card.kind.archive': 'Archivar',
  'file-card.kind.folder': 'Carpeta',
  'file-card.kind.other': 'Archivo',
  'file-card.modified.just-now': 'ahora mismo',
  'file-card.modified.minute-other': 'hace {{count}} min',
  'file-card.kind.image': 'Archivo de imagen',
  'file-card.kind.video': 'archivo de vídeo',
  'file-card.kind.audio': 'Archivo de audio',
  'file-card.kind.code': 'archivo de código',
  'file-card.aria.root': '{{nombre}} ,<x> {{amable}}</x>',
  'file-card.aria.size': 'Tamaño<x> {{tamaño}}</x>',
  'file-card.aria.modified': 'Modificado<x> {{cuando}}</x>',
  'file-card.modified.minute-one': 'Hace 1 minuto',
  'file-card.modified.hour-one': 'Hace 1 hora',
  'file-card.modified.hour-other': '{{contar}} Hace una hora',
  'file-card.modified.day-one': 'ayer',
  'file-card.modified.day-other': '{{contar}} hace días',
  'file-card.modified.week-one': 'Hace 1 semana',
  'file-card.modified.week-other': '{{contar}} hace una semana',
  'file-card.modified.month-one': 'Hace 1 mes',
  'file-card.modified.month-other': '{{contar}} Hace un mes',
}
