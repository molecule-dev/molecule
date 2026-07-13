import type { AiTranslations } from './types.js'

/** Ai translations for Marathi. */
export const mr: AiTranslations = {
  'ai.error.noProvider': 'AI प्रदाता कॉन्फिगर केलेला नाही. प्रथम AI प्रदाता बॉन्ड करा.',
  'ai.error.apiError': 'AI API विनंती अयशस्वी झाली.',
  'ai.error.noResponseBody': 'AI प्रतिसादाचा मुख्य भाग रिक्त आहे.',
  'ai.error.ambiguousProvider':
    'अनेक नामांकित AI प्रदाता बॉन्ड केलेले आहेत आणि कोणतेही डीफॉल्ट सेट केलेले नाही. एक निवडण्यासाठी getProviderByName(name) वापरा.',
}
