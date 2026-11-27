import type { AudioPlayerTranslations } from './types.js'

/** AudioPlayer translations for ta. */
export const ta: Partial<AudioPlayerTranslations> = {
  'audio.seek': 'தேடு',
  'audio.play': 'விளையாடு',
  'audio.pause': 'இடைநிறுத்தம்',
  'audio.mute': 'ஊமை',
  'audio.unmute': 'ஒலியை இயக்கு',
  'audio.captions': 'வசனங்கள்',
  'audio.error.missingProvider':
    'ஆடியோ வழங்குநர் எதுவும் பிணைக்கப்படவில்லை. `setupProviders()`-இல் {{bond}} இலிருந்து `provider` இறக்குமதி செய்து, {{core}} இலிருந்து `setProvider(provider)` ஐ அழைக்கவும்.',
}
