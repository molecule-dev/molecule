import type { ChatTranslations } from './types.js'

/** Ai Chat translations for Hindi. */
export const hi: ChatTranslations = {
  'chat.error.httpError': 'HTTP {{status}}: {{text}}',
  'chat.error.noResponseBody': 'कोई प्रतिक्रिया बॉडी नहीं',
  'chat.error.streamError': 'स्ट्रीम त्रुटि',
  'chat.error.unknownError': 'अज्ञात त्रुटि',
  'chat.error.sendFailed': 'संदेश भेजने में विफल',
  'chat.error.stalled':
    '{{agentName}} ने प्रतिक्रिया देना बंद कर दिया है। यह अभी भी पृष्ठभूमि में प्रक्रिया पूरी कर रहा होगा — नवीनतम जानकारी देखने के लिए पृष्ठ को पुनः लोड करें, या एक नया संदेश भेजें।',
}
