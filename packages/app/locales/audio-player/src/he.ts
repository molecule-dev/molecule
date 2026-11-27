import type { AudioPlayerTranslations } from './types.js'

/** AudioPlayer translations for he. */
export const he: Partial<AudioPlayerTranslations> = {
  'audio.seek': 'לְחַפֵּשׂ',
  'audio.play': 'לְשַׂחֵק',
  'audio.pause': 'הַפסָקָה',
  'audio.mute': 'לְהַשְׁתִיק',
  'audio.unmute': 'בטל השתקה',
  'audio.captions': 'כתוביות',
  'audio.error.missingProvider':
    'אין ספק אודיו מקושר. יש לייבא `provider` מ-{{bond}} ולקרוא ל-`setProvider(provider)` מ-{{core}} ב-`setupProviders()`.',
}
