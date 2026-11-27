import type { AudioPlayerTranslations } from './types.js'

/** AudioPlayer translations for th. */
export const th: Partial<AudioPlayerTranslations> = {
  'audio.seek': 'แสวงหา',
  'audio.play': 'เล่น',
  'audio.pause': 'หยุดชั่วคราว',
  'audio.mute': 'ปิดเสียง',
  'audio.unmute': 'เปิดเสียง',
  'audio.captions': 'คำบรรยาย',
  'audio.error.missingProvider':
    'ไม่มี audio provider ใดถูกผูกไว้ นำเข้า `provider` จาก {{bond}} และเรียก `setProvider(provider)` จาก {{core}} ใน `setupProviders()`',
}
