import type { ChatTranslations } from './types.js'

/** AiChat translations for uz. */
export const uz: Partial<ChatTranslations> = {
  'chat.error.httpError': 'HTTP {{status}}: {{text}}',
  'chat.error.streamError': 'Oqim xatoligi',
  'chat.error.noResponseBody': "Javob beruvchi organ yo'q",
  'chat.error.unknownError': "Noma'lum xato",
  'chat.error.sendFailed': 'Xabar yuborilmadi',
  'chat.error.stalled':
    "{{agentName}} javob berishni to'xtatdi. U hali ham orqa fonda tugallanayotgan bo'lishi mumkin — eng so'nggi xabarlarni ko'rish uchun qayta yuklang yoki yangi xabar yuboring.",
}
