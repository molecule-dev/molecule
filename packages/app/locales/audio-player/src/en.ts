import type { AudioPlayerTranslations } from './types.js'

/** AudioPlayer translations for English. */
export const en: AudioPlayerTranslations = {
  'audio.seek': 'Seek',
  'audio.play': 'Play',
  'audio.pause': 'Pause',
  'audio.mute': 'Mute',
  'audio.unmute': 'Unmute',
  'audio.captions': 'Captions',
  'audio.error.missingProvider':
    'No audio provider is bonded. Import `provider` from {{bond}} and call `setProvider(provider)` from {{core}} in `setupProviders()`.',
}
