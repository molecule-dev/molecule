import type { AudioPlayerTranslations } from './types.js'

/** AudioPlayer translations for ko. */
export const ko: Partial<AudioPlayerTranslations> = {
  'audio.seek': '탐색',
  'audio.play': '놀다',
  'audio.pause': '정지시키다',
  'audio.mute': '무음',
  'audio.unmute': '음소거 해제',
  'audio.captions': '자막',
  'audio.error.missingProvider':
    '오디오 프로바이더가 연결되어 있지 않습니다. {{bond}}에서 `provider`를 가져오고 `setupProviders()`에서 {{core}}의 `setProvider(provider)`를 호출하세요.',
}
