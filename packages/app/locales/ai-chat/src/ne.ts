import type { ChatTranslations } from './types.js'

/** Ai Chat translations for Nepali. */
export const ne: ChatTranslations = {
  'chat.error.httpError': 'HTTP {{status}}: {{text}}',
  'chat.error.noResponseBody': 'कुनै प्रतिक्रिया बडी छैन',
  'chat.error.streamError': 'स्ट्रिम त्रुटि',
  'chat.error.unknownError': 'अज्ञात त्रुटि',
  'chat.error.sendFailed': 'सन्देश पठाउन असफल भयो',
  'chat.error.stalled':
    '{{agentName}} ले प्रतिक्रिया दिन छोड्यो। यो अझै पनि पृष्ठभूमिमा समाप्त भइरहेको हुन सक्छ — पछिल्लो हेर्न पुन: लोड गर्नुहोस्, वा नयाँ सन्देश पठाउनुहोस्।',
}
