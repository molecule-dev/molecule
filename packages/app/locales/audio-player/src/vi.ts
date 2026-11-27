import type { AudioPlayerTranslations } from './types.js'

/** AudioPlayer translations for vi. */
export const vi: Partial<AudioPlayerTranslations> = {
  'audio.seek': 'Tua',
  'audio.play': 'Chơi',
  'audio.pause': 'Tạm dừng',
  'audio.mute': 'Tắt tiếng',
  'audio.unmute': 'Bỏ tắt tiếng',
  'audio.captions': 'Phụ đề',
  'audio.error.missingProvider':
    'Không có nhà cung cấp âm thanh nào được liên kết. Nhập `provider` từ {{bond}} và gọi `setProvider(provider)` từ {{core}} trong `setupProviders()`.',
}
