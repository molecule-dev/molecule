import type { AudioPlayerTranslations } from './types.js'

/** AudioPlayer translations for eu. */
export const eu: Partial<AudioPlayerTranslations> = {
  'audio.seek': 'Bilatu',
  'audio.play': 'Jolastu',
  'audio.pause': 'Pausatu',
  'audio.mute': 'Isilarazi',
  'audio.unmute': 'Ikutzi',
  'audio.captions': 'Azpitituluak',
  'audio.error.missingProvider':
    'Ez dago audio hornitzailerik lotuta. Inportatu `provider` {{bond}}-tik eta deitu `setProvider(provider)` {{core}}-tik `setupProviders()`-n.',
}
