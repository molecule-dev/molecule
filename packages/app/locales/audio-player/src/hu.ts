import type { AudioPlayerTranslations } from './types.js'

/** AudioPlayer translations for hu. */
export const hu: Partial<AudioPlayerTranslations> = {
  'audio.seek': 'Keresés',
  'audio.play': 'Játék',
  'audio.pause': 'Szünet',
  'audio.mute': 'Néma',
  'audio.unmute': 'Némítás feloldása',
  'audio.captions': 'Feliratok',
  'audio.error.missingProvider':
    'Nincs hangszolgáltató kötve. Importáld a `provider`-t a {{bond}}-ból, és hívd meg a `setProvider(provider)` függvényt a {{core}}-ból a `setupProviders()` függvényben.',
}
