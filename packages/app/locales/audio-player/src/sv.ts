import type { AudioPlayerTranslations } from './types.js'

/** AudioPlayer translations for sv. */
export const sv: Partial<AudioPlayerTranslations> = {
  'audio.seek': 'Sök',
  'audio.play': 'Spela',
  'audio.pause': 'Paus',
  'audio.mute': 'Stum',
  'audio.unmute': 'Slå på ljudet',
  'audio.captions': 'Undertexter',
  'audio.error.missingProvider':
    'Ingen ljudprovider är bunden. Importera `provider` från {{bond}} och anropa `setProvider(provider)` från {{core}} i `setupProviders()`.',
}
