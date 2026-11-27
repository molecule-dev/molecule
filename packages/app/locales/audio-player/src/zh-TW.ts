import type { AudioPlayerTranslations } from './types.js'

/** AudioPlayer translations for zh-TW. */
export const zhTW: Partial<AudioPlayerTranslations> = {
  'audio.seek': '尋找',
  'audio.play': '玩',
  'audio.pause': '暫停',
  'audio.mute': '沉默的',
  'audio.unmute': '取消靜音',
  'audio.captions': '字幕',
  'audio.error.missingProvider':
    '沒有綁定音訊提供者。從{{bond}}匯入`provider`，並在`setupProviders()`中從{{core}}呼叫`setProvider(provider)`。',
}
