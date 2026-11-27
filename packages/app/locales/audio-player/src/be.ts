import type { AudioPlayerTranslations } from './types.js'

/** AudioPlayer translations for be. */
export const be: Partial<AudioPlayerTranslations> = {
  'audio.seek': 'Шукаць',
  'audio.play': 'Гуляць',
  'audio.pause': 'Паўза',
  'audio.mute': 'Адключыць гук',
  'audio.unmute': 'Уключыць гук',
  'audio.captions': 'Субтытры',
  'audio.error.missingProvider':
    'Аудыёпастаўшчык не звязаны. Імпартуйце `provider` з {{bond}} і выклічце `setProvider(provider)` з {{core}} у `setupProviders()`.',
}
