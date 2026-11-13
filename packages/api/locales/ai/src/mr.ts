import type { AiTranslations } from './types.js'

/** Ai translations for Marathi. */
export const mr: AiTranslations = {
  'ai.error.noProvider': 'AI प्रदाता कॉन्फिगर केलेला नाही. प्रथम AI प्रदाता बॉन्ड करा.',
  'ai.error.ambiguousProvider':
    'अनेक नामांकित AI प्रदाता बॉन्ड केलेले आहेत आणि कोणतेही डीफॉल्ट सेट केलेले नाही. एक निवडण्यासाठी getProviderByName(name) वापरा.',
  'ai.error.responseIncomplete':
    'एआयचा प्रतिसाद पूर्ण होण्यापूर्वीच थांबला. कृपया पुन्हा प्रयत्न करा.',
  'ai.error.responseTokenLimit':
    'एआयचा प्रतिसाद पूर्ण होण्यापूर्वीच आउटपुट टोकन मर्यादेपर्यंत पोहोचला.',
  'ai.error.apiError': 'एआय सेवेमध्ये त्रुटी आहे. कृपया पुन्हा प्रयत्न करा.',
  'ai.error.noResponseBody': 'एआय सेवेकडून कोणताही प्रतिसाद मिळाला नाही.',
}
