import type { FileCardTranslations } from './types.js'

/** File card translations for sv. Stub — falls back to English defaults. */
export const sv: FileCardTranslations = {
  'file-card.kind.image': 'Image file',
  'file-card.kind.video': 'Video file',
  'file-card.kind.audio': 'Audio file',
  'file-card.kind.document': 'Document',
  'file-card.kind.archive': 'Archive',
  'file-card.kind.code': 'Code file',
  'file-card.kind.folder': 'Folder',
  'file-card.kind.other': 'File',
  'file-card.aria.root': '{{name}}, {{kind}}',
  'file-card.aria.size': 'Size {{size}}',
  'file-card.aria.modified': 'Modified {{when}}',
  'file-card.modified.just-now': 'just now',
  'file-card.modified.minute-one': '1 min ago',
  'file-card.modified.minute-other': '{{count}} min ago',
  'file-card.modified.hour-one': '1 hr ago',
  'file-card.modified.hour-other': '{{count}} hr ago',
  'file-card.modified.day-one': 'yesterday',
  'file-card.modified.day-other': '{{count}} days ago',
  'file-card.modified.week-one': '1 wk ago',
  'file-card.modified.week-other': '{{count}} wk ago',
  'file-card.modified.month-one': '1 mo ago',
  'file-card.modified.month-other': '{{count}} mo ago',
}
