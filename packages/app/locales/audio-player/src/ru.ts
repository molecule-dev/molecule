import type { AudioPlayerTranslations } from './types.js'

/** AudioPlayer translations for ru. */
export const ru: Partial<AudioPlayerTranslations> = {
  'audio.seek': 'Искать',
  'audio.play': 'Играть',
  'audio.pause': 'Пауза',
  'audio.mute': 'Немой',
  'audio.unmute': 'Включить звук',
  'audio.captions': 'Субтитры',
  'audio.error.missingProvider':
    'Аудиопровайдер не привязан. Импортируйте `provider` из {{bond}} и вызовите `setProvider(provider)` из {{core}} в `setupProviders()`.',
}
