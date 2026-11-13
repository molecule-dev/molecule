import type { AiTranslations } from './types.js'

/** Ai translations for Urdu. */
export const ur: AiTranslations = {
  'ai.error.noProvider': 'AI فراہم کنندہ ترتیب نہیں دیا گیا۔ پہلے AI فراہم کنندہ کو بانڈ کریں۔',
  'ai.error.ambiguousProvider':
    'متعدد نامزد AI فراہم کنندگان بانڈ کیے گئے ہیں اور کوئی ڈیفالٹ سیٹ نہیں کیا گیا۔ ایک منتخب کرنے کے لیے getProviderByName(name) استعمال کریں۔',
  'ai.error.responseIncomplete': 'AI جواب مکمل ہونے سے پہلے ختم ہو گیا۔ براہ کرم دوبارہ کوشش کریں۔',
  'ai.error.responseTokenLimit': 'AI جواب مکمل ہونے سے پہلے آؤٹ پٹ ٹوکن کی حد تک پہنچ گیا۔',
  'ai.error.apiError': 'AI سروس کی خرابی۔ براہ کرم دوبارہ کوشش کریں۔',
  'ai.error.noResponseBody': 'AI سروس سے کوئی جواب نہیں آیا۔',
}
