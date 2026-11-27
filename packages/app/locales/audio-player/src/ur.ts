import type { AudioPlayerTranslations } from './types.js'

/** AudioPlayer translations for ur. */
export const ur: Partial<AudioPlayerTranslations> = {
  'audio.seek': 'تلاش کرنا',
  'audio.play': 'کھیلیں',
  'audio.pause': 'توقف',
  'audio.mute': 'خاموش',
  'audio.unmute': 'چالو کریں۔',
  'audio.captions': 'کیپشن',
  'audio.error.missingProvider':
    'کوئی آڈیو فراہم کنندہ پابند نہیں ہے۔ {{bond}} سے `provider` درآمد کریں اور `setupProviders()` میں {{core}} سے `setProvider(provider)` کال کریں۔',
}
