import type { AiTranslations } from './types.js'

/** Ai translations for Hindi. */
export const hi: AiTranslations = {
  'ai.error.noProvider': 'AI प्रदाता कॉन्फ़िगर नहीं है। पहले AI प्रदाता को बॉन्ड करें।',
  'ai.error.ambiguousProvider':
    'कई नामित AI प्रदाता बॉन्ड किए गए हैं और कोई डिफ़ॉल्ट सेट नहीं किया गया है। एक चुनने के लिए getProviderByName(name) का उपयोग करें।',
  'ai.error.responseIncomplete':
    'एआई प्रतिक्रिया पूर्ण होने से पहले ही समाप्त हो गई। कृपया पुनः प्रयास करें।',
  'ai.error.responseTokenLimit':
    'AI की प्रतिक्रिया पूरी होने से पहले ही आउटपुट टोकन सीमा तक पहुंच गई।',
  'ai.error.apiError': 'एआई सेवा में त्रुटि आ गई है। कृपया पुनः प्रयास करें।',
  'ai.error.noResponseBody': 'एआई सेवा से कोई प्रतिक्रिया नहीं मिली।',
}
