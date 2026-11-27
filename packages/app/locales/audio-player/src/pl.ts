import type { AudioPlayerTranslations } from './types.js'

/** AudioPlayer translations for pl. */
export const pl: Partial<AudioPlayerTranslations> = {
  'audio.seek': 'Przewiń',
  'audio.play': 'Grać',
  'audio.pause': 'Pauza',
  'audio.mute': 'Niemy',
  'audio.unmute': 'Wyłącz wyciszenie',
  'audio.captions': 'Napisy',
  'audio.error.missingProvider':
    'Żaden dostawca audio nie jest powiązany. Zaimportuj `provider` z {{bond}} i wywołaj `setProvider(provider)` z {{core}} w `setupProviders()`.',
}
