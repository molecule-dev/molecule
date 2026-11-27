import type { AudioPlayerTranslations } from './types.js'

/** AudioPlayer translations for ga. */
export const ga: Partial<AudioPlayerTranslations> = {
  'audio.seek': 'Lorg',
  'audio.play': 'Seinn',
  'audio.pause': 'Sos',
  'audio.mute': 'Balbhaigh',
  'audio.unmute': 'Díbholadh',
  'audio.captions': 'Fotheidil',
  'audio.error.missingProvider':
    'Níl aon soláthraí fuaime nasctha. Iompórtáil `provider` ó {{bond}} agus glaoigh ar `setProvider(provider)` ó {{core}} i `setupProviders()`.',
}
