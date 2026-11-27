import type { AudioPlayerTranslations } from './types.js'

/** AudioPlayer translations for bs. */
export const bs: Partial<AudioPlayerTranslations> = {
  'audio.seek': 'Traži',
  'audio.play': 'Igraj',
  'audio.pause': 'Pauza',
  'audio.mute': 'Isključi zvuk',
  'audio.unmute': 'Uključi zvuk',
  'audio.captions': 'Titlovi',
  'audio.error.missingProvider':
    'Nijedan audio provajder nije povezan. Uvezite `provider` iz {{bond}} i pozovite `setProvider(provider)` iz {{core}} u `setupProviders()`.',
}
