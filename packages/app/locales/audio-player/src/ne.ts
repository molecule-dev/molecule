import type { AudioPlayerTranslations } from './types.js'

/** AudioPlayer translations for ne. */
export const ne: Partial<AudioPlayerTranslations> = {
  'audio.seek': 'खोज्नुहोस्',
  'audio.play': 'खेल्नुहोस्',
  'audio.pause': 'पज गर्नुहोस्',
  'audio.mute': 'म्यूट गर्नुहोस्',
  'audio.unmute': 'अनम्युट गर्नुहोस्',
  'audio.captions': 'क्याप्शन',
  'audio.error.missingProvider':
    'कुनै पनि अडियो प्रदायक बन्ड गरिएको छैन। {{bond}} बाट `provider` आयात गर्नुहोस् र `setupProviders()` मा {{core}} बाट `setProvider(provider)` लाई कल गर्नुहोस्।',
}
