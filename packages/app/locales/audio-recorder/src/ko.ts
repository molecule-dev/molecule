import type { AudioRecorderTranslations } from './types.js'

/** AudioRecorder translations for ko. */
export const ko: Partial<AudioRecorderTranslations> = {
  'audioRecorder.pause': '일시정지',
  'audioRecorder.resume': '재개',
  'audioRecorder.statusPaused': '일시 중지됨',
  'audioRecorder.unsupported': '이 브라우저에서는 오디오 녹음이 지원되지 않습니다.',
  'audioRecorder.error': '녹화에 실패했습니다. 다시 시도해 주세요.',
  'audioRecorder.permissionDenied':
    '마이크 권한이 거부되었습니다. 접근을 허용하고 다시 시도하세요.',
  'audioRecorder.stop': '멈추다',
  'audioRecorder.elapsed': '경과 시간<x> {{시간}}</x>',
  'audioRecorder.statusProcessed': '녹음됨',
  'audioRecorder.statusError': '오류',
  'audioRecorder.statusIdle': '녹화 준비 완료',
  'audioRecorder.group': '오디오 레코더',
}
