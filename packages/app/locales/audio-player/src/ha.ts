import type { AudioPlayerTranslations } from './types.js'

/** AudioPlayer translations for ha. */
export const ha: Partial<AudioPlayerTranslations> = {
  'audio.seek': 'Nemi',
  'audio.play': 'Yi wasa',
  'audio.pause': 'Dakatar da',
  'audio.mute': 'shiru',
  'audio.unmute': 'Cire shiru',
  'audio.captions': 'Fassara',
  'audio.error.missingProvider':
    'Babu mai bada sauti da aka haɗa. Shigo da `provider` daga {{bond}} kuma kira `setProvider(provider)` daga {{core}} a cikin `setupProviders()`.',
}
