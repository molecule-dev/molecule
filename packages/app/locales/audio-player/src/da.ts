import type { AudioPlayerTranslations } from './types.js'

/** AudioPlayer translations for da. */
export const da: Partial<AudioPlayerTranslations> = {
  'audio.seek': 'Søge',
  'audio.play': 'Spil',
  'audio.pause': 'Pause',
  'audio.mute': 'Stum',
  'audio.unmute': 'Slå lyd til',
  'audio.captions': 'Undertekster',
  'audio.error.missingProvider':
    'Ingen lydprovider er bundet. Importer `provider` fra {{bond}} og kald `setProvider(provider)` fra {{core}} i `setupProviders()`.',
}
