import type { AudioPlayerTranslations } from './types.js'

/** AudioPlayer translations for mk. */
export const mk: Partial<AudioPlayerTranslations> = {
  'audio.seek': 'Барај',
  'audio.play': 'Играј',
  'audio.pause': 'Пауза',
  'audio.mute': 'Исклучи звук',
  'audio.unmute': 'Вклучи звук',
  'audio.captions': 'Титлови',
  'audio.error.missingProvider':
    'Не е поврзан аудио провајдер. Увезете го `provider` од {{bond}} и повикајте го `setProvider(provider)` од {{core}} во `setupProviders()`.',
}
