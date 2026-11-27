import type { AudioPlayerTranslations } from './types.js'

/** AudioPlayer translations for si. */
export const si: Partial<AudioPlayerTranslations> = {
  'audio.seek': 'සොයන්න',
  'audio.play': 'සෙල්ලම් කරන්න',
  'audio.pause': 'විරාමය',
  'audio.mute': 'නිහඬ කරන්න',
  'audio.unmute': 'නිහඬ නොකරන්න',
  'audio.captions': 'උපසිරැසි',
  'audio.error.missingProvider':
    'ශ්‍රව්‍ය සැපයුම්කරුවෙක් බන්ධනය කර නැත. {{bond}} වෙතින් `provider` ආයාත කර `setupProviders()` හි {{core}} වෙතින් `setProvider(provider)` අමතන්න.',
}
