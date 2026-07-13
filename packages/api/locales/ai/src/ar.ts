import type { AiTranslations } from './types.js'

/** Ai translations for Arabic. */
export const ar: AiTranslations = {
  'ai.error.noProvider': 'لم يتم تكوين مزود الذكاء الاصطناعي. قم بربط مزود ذكاء اصطناعي أولاً.',
  'ai.error.apiError': 'فشل طلب واجهة برمجة تطبيقات الذكاء الاصطناعي.',
  'ai.error.noResponseBody': 'نص استجابة الذكاء الاصطناعي فارغ.',
  'ai.error.ambiguousProvider':
    'تم ربط عدة مزودي ذكاء اصطناعي مسمّين ولم يتم تعيين مزود افتراضي. استخدم getProviderByName(name) لاختيار واحد.',
}
