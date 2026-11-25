import type { UploadsTranslations } from './types.js'

/** Uploads translations for Uzbek. */
export const uz: UploadsTranslations = {
  'uploads.error.noProvider': 'Yuklash provayderi sozlanmagan. Avval setProvider() ni chaqiring.',
  'uploads.error.streamLimitReached': 'Oqim chegarasiga yetildi.',
  'uploads.error.aborted': 'Yuklash bekor qilindi.',
  'uploads.error.fileTypeBlocked': '{{type}} turidagi fayllarni yuklab bo‘lmaydi.',
  'uploads.error.activeTypeListed':
    'receiveUploads() {{type}} turini sanab o‘tadi — bu brauzer ishga tushiradigan tur. Uni saqlash uchun allowActiveTypes: true bering va bu fayllarni sendUpload() orqali bering.',
}
