import type { AudioPlayerTranslations } from './types.js'

/** AudioPlayer translations for af. */
export const af: Partial<AudioPlayerTranslations> = {
  'audio.seek': 'Soek',
  'audio.play': 'Speel',
  'audio.pause': 'Pouseer',
  'audio.mute': 'Demp',
  'audio.unmute': 'Ontdemp',
  'audio.captions': 'Onderskrifte',
  'audio.error.missingProvider':
    'Geen oudio-verskaffer is gebonde nie. Voer `provider` vanaf {{bond}} in en roep `setProvider(provider)` vanaf {{core}} in `setupProviders()` aan.',
}
