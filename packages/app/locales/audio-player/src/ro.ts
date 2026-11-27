import type { AudioPlayerTranslations } from './types.js'

/** AudioPlayer translations for ro. */
export const ro: Partial<AudioPlayerTranslations> = {
  'audio.seek': 'Căutare',
  'audio.play': 'Juca',
  'audio.pause': 'Pauză',
  'audio.mute': 'Mut',
  'audio.unmute': 'Activează sunetul',
  'audio.captions': 'Subtitrări',
  'audio.error.missingProvider':
    'Niciun furnizor audio nu este asociat. Importați `provider` din {{bond}} și apelați `setProvider(provider)` din {{core}} în `setupProviders()`.',
}
