import type { AudioPlayerTranslations } from './types.js'

/** AudioPlayer translations for id. */
export const id: Partial<AudioPlayerTranslations> = {
  'audio.seek': 'Cari',
  'audio.play': 'Bermain',
  'audio.pause': 'Berhenti sebentar',
  'audio.mute': 'Bisu',
  'audio.unmute': 'Membunyikan',
  'audio.captions': 'Subtitel',
  'audio.error.missingProvider':
    'Tidak ada penyedia audio yang terikat. Impor `provider` dari {{bond}} dan panggil `setProvider(provider)` dari {{core}} di `setupProviders()`.',
}
