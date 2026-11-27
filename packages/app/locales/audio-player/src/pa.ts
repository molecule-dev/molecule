import type { AudioPlayerTranslations } from './types.js'

/** AudioPlayer translations for pa. */
export const pa: Partial<AudioPlayerTranslations> = {
  'audio.seek': 'ਭਾਲੋ',
  'audio.play': 'ਖੇਡੋ',
  'audio.pause': 'ਵਿਰਾਮ',
  'audio.mute': 'ਮਿਊਟ ਕਰੋ',
  'audio.unmute': 'ਅਣਮਿਊਟ ਕਰੋ',
  'audio.captions': 'ਕੈਪਸ਼ਨ',
  'audio.error.missingProvider':
    'ਕੋਈ ਵੀ ਆਡੀਓ ਪ੍ਰਦਾਤਾ ਬੌਂਡਡ ਨਹੀਂ ਹੈ। {{bond}} ਤੋਂ `provider` ਆਯਾਤ ਕਰੋ ਅਤੇ `setupProviders()` ਵਿੱਚ {{core}} ਤੋਂ `setProvider(provider)` ਨੂੰ ਕਾਲ ਕਰੋ।',
}
