import type { AudioPlayerTranslations } from './types.js'

/** AudioPlayer translations for bg. */
export const bg: Partial<AudioPlayerTranslations> = {
  'audio.seek': 'Търсене',
  'audio.play': 'Играй',
  'audio.pause': 'Пауза',
  'audio.mute': 'Без звук',
  'audio.unmute': 'Включване на звука',
  'audio.captions': 'Субтитри',
  'audio.error.missingProvider':
    'Няма свързан аудио доставчик. Импортирайте `provider` от {{bond}} и извикайте `setProvider(provider)` от {{core}} в `setupProviders()`.',
}
