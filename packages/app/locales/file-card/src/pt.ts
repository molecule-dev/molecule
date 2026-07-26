import type { FileCardTranslations } from './types.js'

/** FileCard translations for pt. */
export const pt: Partial<FileCardTranslations> = {
  'file-card.kind.document': 'Documento',
  'file-card.kind.archive': 'Arquivar',
  'file-card.kind.folder': 'Pasta',
  'file-card.kind.other': 'Arquivo',
  'file-card.modified.just-now': 'agora mesmo',
  'file-card.modified.minute-other': 'há {{count}} min',
  'file-card.kind.image': 'Arquivo de imagem',
  'file-card.kind.video': 'Arquivo de vídeo',
  'file-card.kind.audio': 'Arquivo de áudio',
  'file-card.kind.code': 'Arquivo de código',
  'file-card.aria.root': '{{name}} , {{kind}}',
  'file-card.aria.size': 'Tamanho {{size}}',
  'file-card.aria.modified': 'Modificado {{when}}',
  'file-card.modified.minute-one': '1 minuto atrás',
  'file-card.modified.hour-one': '1 hora atrás',
  'file-card.modified.hour-other': '{{count}} há uma hora',
  'file-card.modified.day-one': 'ontem',
  'file-card.modified.day-other': '{{count}} dias atrás',
  'file-card.modified.week-one': '1 semana atrás',
  'file-card.modified.week-other': '{{count}} semana atrás',
  'file-card.modified.month-one': '1 mês atrás',
  'file-card.modified.month-other': '{{count}} mo atrás',
}
