import type { AiTranslations } from './types.js'

/** Ai translations for Hindi. */
export const hi: AiTranslations = {
  'ai.error.noProvider': 'AI प्रदाता कॉन्फ़िगर नहीं है। पहले AI प्रदाता को बॉन्ड करें।',
  'ai.error.apiError': 'AI API अनुरोध विफल हुआ।',
  'ai.error.noResponseBody': 'AI प्रतिक्रिया का मुख्य भाग खाली है।',
  'ai.error.ambiguousProvider':
    'कई नामित AI प्रदाता बॉन्ड किए गए हैं और कोई डिफ़ॉल्ट सेट नहीं किया गया है। एक चुनने के लिए getProviderByName(name) का उपयोग करें।',
}
