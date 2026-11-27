import type { AudioPlayerTranslations } from './types.js'

/** AudioPlayer translations for sq. */
export const sq: Partial<AudioPlayerTranslations> = {
  'audio.seek': 'Kërko',
  'audio.play': 'Luaj',
  'audio.pause': 'Pauzë',
  'audio.mute': 'Hesht',
  'audio.unmute': 'Aktivizo zërin',
  'audio.captions': 'Titra',
  'audio.error.missingProvider':
    'Nuk ka asnjë ofrues audio të lidhur. Importo `provider` nga {{bond}} dhe thirr `setProvider(provider)` nga {{core}} në `setupProviders()`.',
}
