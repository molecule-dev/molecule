import type { AudioPlayerTranslations } from './types.js'

/** AudioPlayer translations for nb. */
export const nb: Partial<AudioPlayerTranslations> = {
  'audio.seek': 'Søke',
  'audio.play': 'Spille',
  'audio.pause': 'Pause',
  'audio.mute': 'Stum',
  'audio.unmute': 'Slå av lyden',
  'audio.captions': 'Undertekster',
  'audio.error.missingProvider':
    'Ingen lydleverandør er bundet. Importer `provider` fra {{bond}} og kall `setProvider(provider)` fra {{core}} i `setupProviders()`.',
}
