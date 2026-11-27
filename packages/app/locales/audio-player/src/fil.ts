import type { AudioPlayerTranslations } from './types.js'

/** AudioPlayer translations for fil. */
export const fil: Partial<AudioPlayerTranslations> = {
  'audio.seek': 'Maghanap',
  'audio.play': 'Maglaro',
  'audio.pause': 'Ihinto',
  'audio.mute': 'I-mute',
  'audio.unmute': 'I-unmute',
  'audio.captions': 'Mga Caption',
  'audio.error.missingProvider':
    'Walang naka-bond na audio provider. I-import `provider` mula sa {{bond}} at tawagin `setProvider(provider)` mula sa {{core}} sa `setupProviders()`.',
}
