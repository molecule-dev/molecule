import type { AudioPlayerTranslations } from './types.js'

/** AudioPlayer translations for ms. */
export const ms: Partial<AudioPlayerTranslations> = {
  'audio.seek': 'Cari',
  'audio.play': 'Main',
  'audio.pause': 'Jeda',
  'audio.mute': 'Bisu',
  'audio.unmute': 'Nyahbisukan',
  'audio.captions': 'Sari kata',
  'audio.error.missingProvider':
    'Tiada pembekal audio terikat. Import `provider` daripada {{bond}} dan panggil `setProvider(provider)` daripada {{core}} dalam `setupProviders()`.',
}
