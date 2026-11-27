import type { AudioPlayerTranslations } from './types.js'

/** AudioPlayer translations for cs. */
export const cs: Partial<AudioPlayerTranslations> = {
  'audio.seek': 'Hledat',
  'audio.play': 'Hrát',
  'audio.pause': 'Pauza',
  'audio.mute': 'Ztlumit',
  'audio.unmute': 'Zrušit zvuk',
  'audio.captions': 'Titulky',
  'audio.error.missingProvider':
    'Žádný audio poskytovatel není propojen. Importujte `provider` z {{bond}} a zavolejte `setProvider(provider)` z {{core}} v `setupProviders()`.',
}
