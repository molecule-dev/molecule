import type { AudioPlayerTranslations } from './types.js'

/** AudioPlayer translations for mt. */
export const mt: Partial<AudioPlayerTranslations> = {
  'audio.seek': 'Fittex',
  'audio.play': 'Ilgħab',
  'audio.pause': 'Pawża',
  'audio.mute': 'Mut',
  'audio.unmute': 'Neħħi l-mute',
  'audio.captions': 'Sottotitoli',
  'audio.error.missingProvider':
    'L-ebda fornitur tal-awdjo mhu marbut. Importa `provider` minn {{bond}} u sejjaħ `setProvider(provider)` minn {{core}} fi `setupProviders()`.',
}
