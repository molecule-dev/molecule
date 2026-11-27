import type { AudioPlayerTranslations } from './types.js'

/** AudioPlayer translations for ky. */
export const ky: Partial<AudioPlayerTranslations> = {
  'audio.seek': 'Издөө',
  'audio.play': 'Ойнотуу',
  'audio.pause': 'Тыным',
  'audio.mute': 'Үнсүз',
  'audio.unmute': 'Үнсүз режимге өткөрүү',
  'audio.captions': 'Субтитрлер',
  'audio.error.missingProvider':
    'Бир дагы аудио провайдер байланыштырылган эмес. {{bond}} дарегинен `provider` импорттоп, `setupProviders()` ичинде {{core}} дарегинен `setProvider(provider)` функциясын чакырыңыз.',
}
