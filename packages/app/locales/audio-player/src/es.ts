import type { AudioPlayerTranslations } from './types.js'

/** AudioPlayer translations for es. */
export const es: Partial<AudioPlayerTranslations> = {
  'audio.seek': 'Buscar',
  'audio.play': 'Jugar',
  'audio.pause': 'Pausa',
  'audio.mute': 'Silenciar',
  'audio.unmute': 'Silenciar',
  'audio.captions': 'Subtítulos',
  'audio.error.missingProvider':
    'No hay ningún proveedor de audio vinculado. Importa `provider` desde {{bond}} y llama `setProvider(provider)` desde {{core}} en `setupProviders()`.',
}
