import type { FileCardTranslations } from './types.js'

/** FileCard translations for tr. */
export const tr: Partial<FileCardTranslations> = {
  'file-card.kind.document': 'Belge',
  'file-card.kind.archive': 'Arşivle',
  'file-card.kind.folder': 'Klasör',
  'file-card.kind.other': 'Dosya',
  'file-card.modified.just-now': 'az önce',
  'file-card.modified.minute-other': '{{count}} dk önce',
  'file-card.kind.image': 'Görüntü dosyası',
  'file-card.kind.video': 'Video dosyası',
  'file-card.kind.audio': 'Ses dosyası',
  'file-card.kind.code': 'Kod dosyası',
  'file-card.aria.root': '{{name}} , {{kind}}',
  'file-card.aria.size': 'Boyut {{size}}',
  'file-card.aria.modified': 'Değiştirildi {{when}}',
  'file-card.modified.minute-one': '1 dakika önce',
  'file-card.modified.hour-one': '1 saat önce',
  'file-card.modified.hour-other': '{{count}} bir saat önce',
  'file-card.modified.day-one': 'Dün',
  'file-card.modified.day-other': '{{count}} günler önce',
  'file-card.modified.week-one': '1 hafta önce',
  'file-card.modified.week-other': '{{count}} bir hafta önce',
  'file-card.modified.month-one': '1 ay önce',
  'file-card.modified.month-other': '{{count}} ay önce',
}
