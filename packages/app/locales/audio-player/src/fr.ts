import type { AudioPlayerTranslations } from './types.js'

/** AudioPlayer translations for fr. */
export const fr: Partial<AudioPlayerTranslations> = {
  'audio.seek': 'Recherche',
  'audio.play': 'Jouer',
  'audio.pause': 'Pause',
  'audio.mute': 'Muet',
  'audio.unmute': 'Réactiver le son',
  'audio.captions': 'Sous-titres',
  'audio.error.missingProvider':
    "Aucun fournisseur audio n'est lié. Importez `provider` depuis {{bond}} et appelez `setProvider(provider)` depuis {{core}} dans `setupProviders()`.",
}
