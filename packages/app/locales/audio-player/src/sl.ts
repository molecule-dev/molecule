import type { AudioPlayerTranslations } from './types.js'

/** AudioPlayer translations for sl. */
export const sl: Partial<AudioPlayerTranslations> = {
  'audio.seek': 'Išči',
  'audio.play': 'Predvajaj',
  'audio.pause': 'Začasno ustavi',
  'audio.mute': 'Izklopi zvok',
  'audio.unmute': 'Vklopi zvok',
  'audio.captions': 'Podnapisi',
  'audio.error.missingProvider':
    'Noben zvočni ponudnik ni povezan. Uvozite `provider` iz {{bond}} in pokličite `setProvider(provider)` iz {{core}} v `setupProviders()`.',
}
