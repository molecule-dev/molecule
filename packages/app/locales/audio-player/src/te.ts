import type { AudioPlayerTranslations } from './types.js'

/** AudioPlayer translations for te. */
export const te: Partial<AudioPlayerTranslations> = {
  'audio.seek': 'వెతకండి',
  'audio.play': 'ఆట',
  'audio.pause': 'విరామం',
  'audio.mute': 'మ్యూట్',
  'audio.unmute': 'అన్‌మ్యూట్',
  'audio.captions': 'క్యాప్షన్లు',
  'audio.error.missingProvider':
    'ఏ ఆడియో ప్రొవైడర్ కూడా బాండెడ్ చేయబడలేదు. `setupProviders()` లో `provider` {{bond}} నుండి ఇంపోర్ట్ చేసి, `setProvider(provider)` {{core}} నుండి కాల్ చేయండి.',
}
