import type { AudioPlayerTranslations } from './types.js'

/** AudioPlayer translations for ar. */
export const ar: Partial<AudioPlayerTranslations> = {
  'audio.seek': 'بحث',
  'audio.play': 'يلعب',
  'audio.pause': 'يوقف',
  'audio.mute': 'صامت',
  'audio.unmute': 'إلغاء كتم الصوت',
  'audio.captions': 'الترجمة',
  'audio.error.missingProvider':
    'لا يوجد موفر صوت مرتبط. استورد `provider` من {{bond}} واستدعِ `setProvider(provider)` من {{core}} في `setupProviders()`.',
}
