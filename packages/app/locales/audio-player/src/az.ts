import type { AudioPlayerTranslations } from './types.js'

/** AudioPlayer translations for az. */
export const az: Partial<AudioPlayerTranslations> = {
  'audio.seek': 'Axtar',
  'audio.play': 'Oyna',
  'audio.pause': 'Fasilə',
  'audio.mute': 'Səssiz',
  'audio.unmute': 'Səssiz rejimdən çıxarın',
  'audio.captions': 'Titrlər',
  'audio.error.missingProvider':
    'Heç bir audio provayderi bağlı deyil. {{bond}}-dan `provider` idxal edin və `setupProviders()`-də {{core}}-dan `setProvider(provider)` çağırın.',
}
