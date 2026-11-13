import type { AiTranslations } from './types.js'

/** Ai translations for Nepali. */
export const ne: AiTranslations = {
  'ai.error.noProvider': 'AI प्रदायक कन्फिगर गरिएको छैन। पहिले AI प्रदायक बन्ड गर्नुहोस्।',
  'ai.error.ambiguousProvider':
    'धेरै नामाकरण गरिएका AI प्रदायकहरू बन्ड गरिएका छन् र कुनै पूर्वनिर्धारित सेट गरिएको छैन। एउटा छनोट गर्न getProviderByName(name) प्रयोग गर्नुहोस्।',
  'ai.error.responseIncomplete':
    'AI प्रतिक्रिया पूरा हुनुभन्दा पहिले नै समाप्त भयो। कृपया फेरि प्रयास गर्नुहोस्।',
  'ai.error.responseTokenLimit':
    'पूरा हुनुभन्दा पहिले नै एआई प्रतिक्रिया आउटपुट टोकन सीमामा पुग्यो।',
  'ai.error.apiError': 'AI सेवा त्रुटि। कृपया फेरि प्रयास गर्नुहोस्।',
  'ai.error.noResponseBody': 'एआई सेवाबाट कुनै प्रतिक्रिया आएन।',
}
