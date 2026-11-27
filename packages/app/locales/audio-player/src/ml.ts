import type { AudioPlayerTranslations } from './types.js'

/** AudioPlayer translations for ml. */
export const ml: Partial<AudioPlayerTranslations> = {
  'audio.seek': 'തിരയുക',
  'audio.play': 'കളിക്കുക',
  'audio.pause': 'താൽക്കാലികമായി നിർത്തുക',
  'audio.mute': 'നിശബ്ദമാക്കുക',
  'audio.unmute': 'അൺമ്യൂട്ട് ചെയ്യുക',
  'audio.captions': 'ക്യാപ്ഷനുകൾ',
  'audio.error.missingProvider':
    'ഒരു ഓഡിയോ ദാതാവും ബോണ്ടഡ് ചെയ്തിട്ടില്ല. {{bond}}-ൽ നിന്ന് `provider` ഇറക്കുമതി ചെയ്യുക, `setupProviders()`-ൽ {{core}}-ൽ നിന്ന് `setProvider(provider)` വിളിക്കുക.',
}
