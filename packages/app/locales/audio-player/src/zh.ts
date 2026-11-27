import type { AudioPlayerTranslations } from './types.js'

/** AudioPlayer translations for zh. */
export const zh: Partial<AudioPlayerTranslations> = {
  'audio.seek': '拖动播放进度',
  'audio.play': '玩',
  'audio.pause': '暂停',
  'audio.mute': '沉默的',
  'audio.unmute': '取消静音',
  'audio.captions': '字幕',
  'audio.error.missingProvider':
    '没有绑定音频提供程序。从{{bond}}导入`provider`，并在`setupProviders()`中从{{core}}调用`setProvider(provider)`。',
}
