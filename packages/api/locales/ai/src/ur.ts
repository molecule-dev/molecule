import type { AiTranslations } from './types.js'

/** Ai translations for Urdu. */
export const ur: AiTranslations = {
  'ai.error.noProvider': 'AI فراہم کنندہ ترتیب نہیں دیا گیا۔ پہلے AI فراہم کنندہ کو بانڈ کریں۔',
  'ai.error.apiError': 'AI API درخواست ناکام ہوگئی۔',
  'ai.error.noResponseBody': 'AI جواب کا باڈی خالی ہے۔',
  'ai.error.ambiguousProvider':
    'متعدد نامزد AI فراہم کنندگان بانڈ کیے گئے ہیں اور کوئی ڈیفالٹ سیٹ نہیں کیا گیا۔ ایک منتخب کرنے کے لیے getProviderByName(name) استعمال کریں۔',
}
