import type { AudioPlayerTranslations } from './types.js'

/** AudioPlayer translations for ca. */
export const ca: Partial<AudioPlayerTranslations> = {
  'audio.seek': 'Cerca',
  'audio.play': 'Reprodueix',
  'audio.pause': 'Pausa',
  'audio.mute': 'Silenciar',
  'audio.unmute': 'Activa el so',
  'audio.captions': 'Subtítols',
  'audio.error.missingProvider':
    "No hi ha cap proveïdor d'àudio vinculat. Importeu `provider` des de {{bond}} i crideu `setProvider(provider)` des de {{core}} a `setupProviders()`.",
}
