import type { AudioPlayerTranslations } from './types.js'

/** AudioPlayer translations for is. */
export const is: Partial<AudioPlayerTranslations> = {
  'audio.seek': 'Leita',
  'audio.play': 'Spila',
  'audio.pause': 'Gera hlé',
  'audio.mute': 'Þagga',
  'audio.unmute': 'Hljóðnemi af',
  'audio.captions': 'Skjátextar',
  'audio.error.missingProvider':
    'Enginn hljóðveitandi er tengdur. Flyttu inn `provider` frá {{bond}} og kallaðu á `setProvider(provider)` frá {{core}} í `setupProviders()`.',
}
