import type { AudioPlayerTranslations } from './types.js'

/** AudioPlayer translations for fa. */
export const fa: Partial<AudioPlayerTranslations> = {
  'audio.seek': 'جستجو',
  'audio.play': 'بازی',
  'audio.pause': 'مکث',
  'audio.mute': 'بی‌صدا کردن',
  'audio.unmute': 'بی‌صدا کردن',
  'audio.captions': 'زیرنویس',
  'audio.error.missingProvider':
    'هیچ ارائه‌دهنده صوتی پیوند داده نشده است. `provider` از {{bond}} وارد کنید و `setProvider(provider)` را از {{core}} در `setupProviders()` فراخوانی کنید.',
}
