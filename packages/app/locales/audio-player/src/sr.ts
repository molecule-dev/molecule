import type { AudioPlayerTranslations } from './types.js'

/** AudioPlayer translations for sr. */
export const sr: Partial<AudioPlayerTranslations> = {
  'audio.seek': 'Тражи',
  'audio.play': 'Играј',
  'audio.pause': 'Пауза',
  'audio.mute': 'Искључи звук',
  'audio.unmute': 'Укључи звук',
  'audio.captions': 'Титлови',
  'audio.error.missingProvider':
    'Ниједан аудио провајдер није повезан. Увезите `provider` из {{bond}} и позовите `setProvider(provider)` из {{core}} у `setupProviders()`.',
}
