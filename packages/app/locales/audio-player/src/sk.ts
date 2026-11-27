import type { AudioPlayerTranslations } from './types.js'

/** AudioPlayer translations for sk. */
export const sk: Partial<AudioPlayerTranslations> = {
  'audio.seek': 'Hľadať',
  'audio.play': 'Hrať',
  'audio.pause': 'Pozastaviť',
  'audio.mute': 'Stlmiť',
  'audio.unmute': 'Zrušiť stlmenie',
  'audio.captions': 'Titulky',
  'audio.error.missingProvider':
    'Žiadny audio poskytovateľ nie je prepojený. Importujte `provider` z {{bond}} a zavolajte `setProvider(provider)` z {{core}} v `setupProviders()`.',
}
