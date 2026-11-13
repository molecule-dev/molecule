import type { ChatTranslations } from './types.js'

/** Ai Chat translations for Arabic. */
export const ar: ChatTranslations = {
  'chat.error.httpError': 'HTTP {{status}}: {{text}}',
  'chat.error.noResponseBody': 'لا يوجد نص استجابة',
  'chat.error.streamError': 'خطأ في البث',
  'chat.error.unknownError': 'خطأ غير معروف',
  'chat.error.sendFailed': 'فشل إرسال الرسالة',
  'chat.error.stalled':
    'توقف {{agentName}} عن الاستجابة. قد يكون لا يزال يُنهي العملية في الخلفية — أعد تحميل الصفحة للاطلاع على آخر المستجدات، أو أرسل رسالة جديدة.',
}
