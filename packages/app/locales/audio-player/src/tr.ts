import type { AudioPlayerTranslations } from './types.js'

/** AudioPlayer translations for tr. */
export const tr: Partial<AudioPlayerTranslations> = {
  'audio.seek': 'İleri sar',
  'audio.play': 'Oynamak',
  'audio.pause': 'Duraklat',
  'audio.mute': 'Sesini kapatmak',
  'audio.unmute': 'Sesini açmak',
  'audio.captions': 'Altyazılar',
  'audio.error.missingProvider':
    "Hiçbir ses sağlayıcısı bağlanmamıştır. {{bond}} paketinden `provider`'ı içe aktarın ve `setupProviders()` içinde {{core}} paketinden `setProvider(provider)`'ı çağırın.",
}
