import type { AudioPlayerTranslations } from './types.js'

/** AudioPlayer translations for pt. */
export const pt: Partial<AudioPlayerTranslations> = {
  'audio.seek': 'Buscar',
  'audio.play': 'Jogar',
  'audio.pause': 'Pausa',
  'audio.mute': 'Mudo',
  'audio.unmute': 'Ativar som',
  'audio.captions': 'Legendas',
  'audio.error.missingProvider':
    'Nenhum provedor de áudio está vinculado. Importe `provider` de {{bond}} e chame `setProvider(provider)` de {{core}} em `setupProviders()`.',
}
