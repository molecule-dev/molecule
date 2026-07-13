import type { AiTranslations } from './types.js'

/** Ai translations for Nepali. */
export const ne: AiTranslations = {
  'ai.error.noProvider': 'AI प्रदायक कन्फिगर गरिएको छैन। पहिले AI प्रदायक बन्ड गर्नुहोस्।',
  'ai.error.apiError': 'AI API अनुरोध असफल भयो।',
  'ai.error.noResponseBody': 'AI प्रतिक्रिया बडी खाली छ।',
  'ai.error.ambiguousProvider':
    'धेरै नामाकरण गरिएका AI प्रदायकहरू बन्ड गरिएका छन् र कुनै पूर्वनिर्धारित सेट गरिएको छैन। एउटा छनोट गर्न getProviderByName(name) प्रयोग गर्नुहोस्।',
}
