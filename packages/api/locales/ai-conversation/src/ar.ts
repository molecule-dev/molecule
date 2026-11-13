import type { ConversationTranslations } from './types.js'

/** Conversation translations for Arabic. */
export const ar: ConversationTranslations = {
  'conversation.error.messageRequired': 'الرسالة مطلوبة',
  'conversation.error.aiNotConfigured': 'لم يتم تكوين مزود الذكاء الاصطناعي',
  'conversation.error.unknownAiError': 'خطأ غير معروف في الذكاء الاصطناعي',
  'conversation.error.notFound': 'لم يتم العثور على محادثة',
  'conversation.error.streamError': 'خطأ في بث الذكاء الاصطناعي',
  'conversation.error.forbidden': 'تم الرفض',
  'conversation.error.unauthorized': 'غير مصرح به',
  'conversation.error.clearFailed': 'فشل في مسح المحادثة',
  'conversation.error.idRequired':
    'يُعدّ معرّف المحادثة مطلوبًا عندما يحتوي المشروع على أكثر من محادثة واحدة.',
  'conversation.error.historyFailed': 'فشل تحميل سجل المحادثة',
  'conversation.error.readFailed': 'فشل في قراءة المحادثة',
  'conversation.error.updateFailed': 'فشل تحديث المحادثة',
}
