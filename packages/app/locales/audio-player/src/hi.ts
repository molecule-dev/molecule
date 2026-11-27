import type { AudioPlayerTranslations } from './types.js'

/** AudioPlayer translations for hi. */
export const hi: Partial<AudioPlayerTranslations> = {
  'audio.seek': 'खोजें',
  'audio.play': 'खेल',
  'audio.pause': 'विराम',
  'audio.mute': 'आवाज़ बंद करना',
  'audio.unmute': 'अनम्यूट',
  'audio.captions': 'कैप्शन',
  'audio.error.missingProvider':
    'कोई ऑडियो प्रदाता बॉन्डेड नहीं है। {{bond}} से `provider` आयात करें और `setupProviders()` में {{core}} से `setProvider(provider)` को कॉल करें।',
}
