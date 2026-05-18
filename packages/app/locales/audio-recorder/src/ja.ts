import type { AudioRecorderTranslations } from './types.js'

/** AudioRecorder translations for ja. */
export const ja: Partial<AudioRecorderTranslations> = {
  'audioRecorder.pause': '一時停止',
  'audioRecorder.resume': '再開',
  'audioRecorder.statusPaused': '一時停止',
  'audioRecorder.unsupported': 'このブラウザでは音声録音はサポートされていません',
  'audioRecorder.error': '録音に失敗しました。もう一度お試しください。',
  'audioRecorder.permissionDenied':
    'マイクの使用許可が拒否されました。アクセスを許可して、もう一度お試しください。',
  'audioRecorder.stop': '停止',
  'audioRecorder.elapsed': '経過時間{{時間}}',
  'audioRecorder.statusProcessed': '録音済み',
  'audioRecorder.statusError': 'エラー',
  'audioRecorder.statusIdle': '録音準備完了',
  'audioRecorder.group': '音声レコーダー',
}
