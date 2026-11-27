import type { AudioPlayerTranslations } from './types.js'

/** AudioPlayer translations for et. */
export const et: Partial<AudioPlayerTranslations> = {
  'audio.seek': 'Otsi',
  'audio.play': 'Mängi',
  'audio.pause': 'Paus',
  'audio.mute': 'Vaigista',
  'audio.unmute': 'Tühista heli',
  'audio.captions': 'Subtiitrid',
  'audio.error.missingProvider':
    'Helipakkujat pole ühendatud. Impordi `provider` paketist {{bond}} ja kutsu `setProvider(provider)` paketist {{core}} funktsioonis `setupProviders()`.',
}
