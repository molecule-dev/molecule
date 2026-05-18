import type { AudioRecorderTranslations } from './types.js'

/** AudioRecorder translations for zh. */
export const zh: Partial<AudioRecorderTranslations> = {
  'audioRecorder.pause': '暂停',
  'audioRecorder.resume': '恢复',
  'audioRecorder.statusPaused': '已暂停',
  'audioRecorder.unsupported': '此浏览器不支持音频录制。',
  'audioRecorder.error': '录制失败，请重试。',
  'audioRecorder.permissionDenied': '麦克风权限被拒绝。请允许访问并重试。',
  'audioRecorder.stop': '停止',
  'audioRecorder.elapsed': '过去{{时间}}',
  'audioRecorder.statusProcessed': '已录制',
  'audioRecorder.statusError': '错误',
  'audioRecorder.statusIdle': '准备录制',
  'audioRecorder.group': '录音机',
}
