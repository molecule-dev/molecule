import type { AiTranslations } from './types.js'

/** Ai translations for Uzbek. */
export const uz: AiTranslations = {
  'ai.error.noProvider': 'AI provayder sozlanmagan. Avval AI provayderini ulang.',
  'ai.error.ambiguousProvider':
    'Bir nechta nomlangan AI provayderi ulangan va standart o‘rnatilmagan. Birini tanlash uchun getProviderByName(name) dan foydalaning.',
  'ai.error.responseIncomplete':
    "Sun'iy intellekt javobi tugallanmasdan oldin tugadi. Qaytadan urinib ko'ring.",
  'ai.error.responseTokenLimit':
    "Sun'iy intellekt javobi tugallanishidan oldin chiqish tokenining chegarasiga yetdi.",
  'ai.error.apiError': "Sun'iy intellekt xizmatida xatolik. Qaytadan urinib ko'ring.",
  'ai.error.noResponseBody': "Sun'iy intellekt xizmatidan javob yo'q.",
}
