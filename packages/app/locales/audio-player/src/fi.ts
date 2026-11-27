import type { AudioPlayerTranslations } from './types.js'

/** AudioPlayer translations for fi. */
export const fi: Partial<AudioPlayerTranslations> = {
  'audio.seek': 'Etsi',
  'audio.play': 'Pelata',
  'audio.pause': 'Tauko',
  'audio.mute': 'Mykistä',
  'audio.unmute': 'Poista mykistys',
  'audio.captions': 'Tekstitys',
  'audio.error.missingProvider':
    'Äänipalveluntarjoajaa ei ole sidottu. Tuo `provider` kohdasta {{bond}} ja kutsu `setProvider(provider)` kohdasta {{core}} kohdassa `setupProviders()`.',
}
