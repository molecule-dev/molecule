import type { AudioPlayerTranslations } from './types.js'

/** AudioPlayer translations for de. */
export const de: Partial<AudioPlayerTranslations> = {
  'audio.seek': 'Suchen',
  'audio.play': 'Spielen',
  'audio.pause': 'Pause',
  'audio.mute': 'Stumm',
  'audio.unmute': 'Stummschaltung aufheben',
  'audio.captions': 'Untertitel',
  'audio.error.missingProvider':
    'Es ist kein Audio-Provider gebunden. Importieren Sie `provider` aus {{bond}} und rufen Sie `setProvider(provider)` aus {{core}} in `setupProviders()` auf.',
}
