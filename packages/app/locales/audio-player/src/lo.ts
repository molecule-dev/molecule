import type { AudioPlayerTranslations } from './types.js'

/** AudioPlayer translations for lo. */
export const lo: Partial<AudioPlayerTranslations> = {
  'audio.seek': 'ຊອກຫາ',
  'audio.play': 'ຫຼິ້ນ',
  'audio.pause': 'ຢຸດຊົ່ວຄາວ',
  'audio.mute': 'ປິດສຽງ',
  'audio.unmute': 'ເປີດສຽງ',
  'audio.captions': 'ຄຳບັນຍາຍ',
  'audio.error.missingProvider':
    'ບໍ່ມີຜູ້ໃຫ້ບໍລິການສຽງໃດຖືກຜູກມັດ. ນຳເຂົ້າ `provider` ຈາກ {{bond}} ແລະ ເອີ້ນ `setProvider(provider)` ຈາກ {{core}} ໃນ `setupProviders()`.',
}
