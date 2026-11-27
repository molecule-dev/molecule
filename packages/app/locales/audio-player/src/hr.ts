import type { AudioPlayerTranslations } from './types.js'

/** AudioPlayer translations for hr. */
export const hr: Partial<AudioPlayerTranslations> = {
  'audio.seek': 'Tražiti',
  'audio.play': 'Igrati',
  'audio.pause': 'Pauza',
  'audio.mute': 'Isključi zvuk',
  'audio.unmute': 'Uključi zvuk',
  'audio.captions': 'Titlovi',
  'audio.error.missingProvider':
    'Nijedan audio pružatelj nije povezan. Uvezite `provider` iz {{bond}} i pozovite `setProvider(provider)` iz {{core}} u `setupProviders()`.',
}
