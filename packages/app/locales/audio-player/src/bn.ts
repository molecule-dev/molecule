import type { AudioPlayerTranslations } from './types.js'

/** AudioPlayer translations for bn. */
export const bn: Partial<AudioPlayerTranslations> = {
  'audio.seek': 'অনুসন্ধান করুন',
  'audio.play': 'খেলা',
  'audio.pause': 'বিরতি',
  'audio.mute': 'মূক',
  'audio.unmute': 'আনমিউট করুন',
  'audio.captions': 'সাবটাইটেল',
  'audio.error.missingProvider':
    'কোনো অডিও প্রোভাইডার সংযুক্ত নেই। {{bond}} থেকে `provider` ইম্পোর্ট করুন এবং `setupProviders()`-এ {{core}} থেকে `setProvider(provider)` কল করুন।',
}
