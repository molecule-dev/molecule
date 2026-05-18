import type { FileCardTranslations } from './types.js'

/** FileCard translations for ja. */
export const ja: Partial<FileCardTranslations> = {
  'file-card.kind.document': 'ドキュメント',
  'file-card.kind.archive': 'アーカイブ',
  'file-card.kind.folder': 'フォルダ',
  'file-card.kind.other': 'ファイル',
  'file-card.modified.just-now': 'たった今',
  'file-card.modified.minute-other': '{{count}}分前',
  'file-card.kind.image': '画像ファイル',
  'file-card.kind.video': 'ビデオファイル',
  'file-card.kind.audio': '音声ファイル',
  'file-card.kind.code': 'コードファイル',
  'file-card.aria.root': '{{名前}} 、<x> {{親切}}</x>',
  'file-card.aria.size': 'サイズ{{サイズ}}',
  'file-card.aria.modified': '修正済み{{いつ}}',
  'file-card.modified.minute-one': '1分前',
  'file-card.modified.hour-one': '1時間前',
  'file-card.modified.hour-other': '{{カウント}} 1時間前',
  'file-card.modified.day-one': '昨日',
  'file-card.modified.day-other': '{{カウント}}数日前',
  'file-card.modified.week-one': '1週間前',
  'file-card.modified.week-other': '{{カウント}} 1週間前',
  'file-card.modified.month-one': '1ヶ月前',
  'file-card.modified.month-other': '{{カウント}}もっと前',
}
