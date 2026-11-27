import type { AudioPlayerTranslations } from './types.js'

/** AudioPlayer translations for sw. */
export const sw: Partial<AudioPlayerTranslations> = {
  'audio.seek': 'Tafuta',
  'audio.play': 'Cheza',
  'audio.pause': 'Sitisha',
  'audio.mute': 'Zima sauti',
  'audio.unmute': 'Rejesha sauti',
  'audio.captions': 'Manukuu',
  'audio.error.missingProvider':
    'Hakuna mtoa huduma wa sauti aliyeunganishwa. Ingiza `provider` kutoka {{bond}} na uite `setProvider(provider)` kutoka {{core}} katika `setupProviders()`.',
}
