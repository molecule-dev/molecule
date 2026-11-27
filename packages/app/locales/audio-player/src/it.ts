import type { AudioPlayerTranslations } from './types.js'

/** AudioPlayer translations for it. */
export const it: Partial<AudioPlayerTranslations> = {
  'audio.seek': 'Cerca',
  'audio.play': 'Giocare',
  'audio.pause': 'Pausa',
  'audio.mute': 'Silenzioso',
  'audio.unmute': "Riattiva l'audio",
  'audio.captions': 'Sottotitoli',
  'audio.error.missingProvider':
    'Nessun provider audio è collegato. Importa `provider` da {{bond}} e chiama `setProvider(provider)` da {{core}} in `setupProviders()`.',
}
