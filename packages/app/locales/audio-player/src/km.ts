import type { AudioPlayerTranslations } from './types.js'

/** AudioPlayer translations for km. */
export const km: Partial<AudioPlayerTranslations> = {
  'audio.seek': 'ស្វែងរក',
  'audio.play': 'លេង',
  'audio.pause': 'ផ្អាក',
  'audio.mute': 'បិទសំឡេង',
  'audio.unmute': 'បើកសំឡេង',
  'audio.captions': 'ចំណងជើងរង',
  'audio.error.missingProvider':
    'គ្មាន​អ្នកផ្តល់សំឡេង​ណាមួយ​ត្រូវ​បាន​ភ្ជាប់​ទេ។ នាំចូល `provider` ពី {{bond}} ហើយ​ហៅ `setProvider(provider)` ពី {{core}} ក្នុង `setupProviders()` ។',
}
