import type { AudioPlayerTranslations } from './types.js'

/** AudioPlayer translations for gl. */
export const gl: Partial<AudioPlayerTranslations> = {
  'audio.seek': 'Buscar',
  'audio.play': 'Reproducir',
  'audio.pause': 'Pausa',
  'audio.mute': 'Silenciar',
  'audio.unmute': 'Activar son',
  'audio.captions': 'Subtítulos',
  'audio.error.missingProvider':
    'Non hai ningún provedor de audio vinculado. Importa `provider` desde {{bond}} e chama `setProvider(provider)` desde {{core}} en `setupProviders()`.',
}
