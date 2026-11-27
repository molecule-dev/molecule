import type { AudioPlayerTranslations } from './types.js'

/** AudioPlayer translations for kk. */
export const kk: Partial<AudioPlayerTranslations> = {
  'audio.seek': 'Іздеу',
  'audio.play': 'Ойнату',
  'audio.pause': 'Кідірту',
  'audio.mute': 'Дыбысты өшіру',
  'audio.unmute': 'Дыбысты қосу',
  'audio.captions': 'Субтитрлер',
  'audio.error.missingProvider':
    'Ешқандай аудио провайдер байланыстырылмаған. {{bond}} ішінен `provider` импорттаңыз және `setupProviders()` ішінде {{core}} ішінен `setProvider(provider)` шақырыңыз.',
}
