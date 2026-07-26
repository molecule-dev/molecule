import type { FileCardTranslations } from './types.js'

/** FileCard translations for ko. */
export const ko: Partial<FileCardTranslations> = {
  'file-card.kind.document': '문서',
  'file-card.kind.archive': '보관',
  'file-card.kind.folder': '폴더',
  'file-card.kind.other': '파일',
  'file-card.modified.just-now': '방금 전',
  'file-card.modified.minute-other': '{{count}}분 전',
  'file-card.kind.image': '이미지 파일',
  'file-card.kind.video': '비디오 파일',
  'file-card.kind.audio': '오디오 파일',
  'file-card.kind.code': '코드 파일',
  'file-card.aria.root': '{{name}} , {{kind}}',
  'file-card.aria.size': '크기 {{size}}',
  'file-card.aria.modified': '수정됨 {{when}}',
  'file-card.modified.minute-one': '1분 전',
  'file-card.modified.hour-one': '1시간 전',
  'file-card.modified.hour-other': '{{count}} 한 시간 전',
  'file-card.modified.day-one': '어제',
  'file-card.modified.day-other': '{{count}} 며칠 전',
  'file-card.modified.week-one': '1주일 전',
  'file-card.modified.week-other': '{{count}} 일주일 전',
  'file-card.modified.month-one': '1개월 전',
  'file-card.modified.month-other': '{{count}} 모 전',
}
