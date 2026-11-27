import type { AudioPlayerTranslations } from './types.js'

/** AudioPlayer translations for lt. */
export const lt: Partial<AudioPlayerTranslations> = {
  'audio.seek': 'Ieškoti',
  'audio.play': 'Žaisti',
  'audio.pause': 'Pauzė',
  'audio.mute': 'Nutildyti',
  'audio.unmute': 'Įjungti garsą',
  'audio.captions': 'Subtitrai',
  'audio.error.missingProvider':
    'Garso tiekėjas nėra sujungtas. Importuokite `provider` iš {{bond}} ir iškvieskite `setProvider(provider)` iš {{core}} `setupProviders()` funkcijoje.',
}
