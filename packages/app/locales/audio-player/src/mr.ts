import type { AudioPlayerTranslations } from './types.js'

/** AudioPlayer translations for mr. */
export const mr: Partial<AudioPlayerTranslations> = {
  'audio.seek': 'शोधा',
  'audio.play': 'खेळा',
  'audio.pause': 'थांबा',
  'audio.mute': 'म्यूट',
  'audio.unmute': 'अनम्यूट',
  'audio.captions': 'कॅप्शन',
  'audio.error.missingProvider':
    'कोणताही ऑडिओ प्रोव्हायडर जोडलेला नाही. {{bond}} मधून `provider` आयात करा आणि `setupProviders()` मध्ये {{core}} मधून `setProvider(provider)` ला कॉल करा.',
}
