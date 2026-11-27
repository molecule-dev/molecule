import type { AudioPlayerTranslations } from './types.js'

/** AudioPlayer translations for mn. */
export const mn: Partial<AudioPlayerTranslations> = {
  'audio.seek': 'Хайх',
  'audio.play': 'Тоглох',
  'audio.pause': 'Түр зогсоох',
  'audio.mute': 'Дуугүй болгох',
  'audio.unmute': 'Дуугүй болгох',
  'audio.captions': 'Субтитр',
  'audio.error.missingProvider':
    'Аудио үйлчилгээ үзүүлэгч холбогдоогүй байна. {{bond}}-с `provider` импортлоод `setupProviders()` дотор {{core}}-с `setProvider(provider)`-г дуудна уу.',
}
