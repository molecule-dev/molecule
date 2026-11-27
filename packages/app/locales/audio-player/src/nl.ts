import type { AudioPlayerTranslations } from './types.js'

/** AudioPlayer translations for nl. */
export const nl: Partial<AudioPlayerTranslations> = {
  'audio.seek': 'Zoeken',
  'audio.play': 'Toneelstuk',
  'audio.pause': 'Pauze',
  'audio.mute': 'Stom',
  'audio.unmute': 'Dempen inschakelen',
  'audio.captions': 'Ondertitels',
  'audio.error.missingProvider':
    'Er is geen audioprovider gekoppeld. Importeer `provider` uit {{bond}} en roep `setProvider(provider)` aan vanuit {{core}} in `setupProviders()`.',
}
