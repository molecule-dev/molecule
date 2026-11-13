import type { AiTranslations } from './types.js'

/** Ai translations for Arabic. */
export const ar: AiTranslations = {
  'ai.error.noProvider': 'لم يتم تكوين مزود الذكاء الاصطناعي. قم بربط مزود ذكاء اصطناعي أولاً.',
  'ai.error.ambiguousProvider':
    'تم ربط عدة مزودي ذكاء اصطناعي مسمّين ولم يتم تعيين مزود افتراضي. استخدم getProviderByName(name) لاختيار واحد.',
  'ai.error.responseIncomplete':
    'انتهت استجابة الذكاء الاصطناعي قبل اكتمالها. يرجى المحاولة مرة أخرى.',
  'ai.error.responseTokenLimit':
    'وصل رد الذكاء الاصطناعي إلى الحد الأقصى لعدد الرموز المميزة قبل اكتماله.',
  'ai.error.apiError': 'حدث خطأ في خدمة الذكاء الاصطناعي. يرجى المحاولة مرة أخرى.',
  'ai.error.noResponseBody': 'لم يتم تلقي أي رد من خدمة الذكاء الاصطناعي.',
}
