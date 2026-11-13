import type { ConversationTranslations } from './types.js'

/** Conversation translations for Hindi. */
export const hi: ConversationTranslations = {
  'conversation.error.messageRequired': 'message आवश्यक है',
  'conversation.error.aiNotConfigured': 'AI प्रोवाइडर कॉन्फ़िगर नहीं है',
  'conversation.error.unknownAiError': 'अज्ञात AI त्रुटि',
  'conversation.error.notFound': 'कोई वार्तालाप नहीं मिला',
  'conversation.error.streamError': 'AI स्ट्रीमिंग त्रुटि',
  'conversation.error.forbidden': 'पहुंच अस्वीकृत',
  'conversation.error.unauthorized': 'अनधिकृत',
  'conversation.error.clearFailed': 'बातचीत को स्पष्ट करने में असफल रहे',
  'conversation.error.idRequired':
    'यदि प्रोजेक्ट में एक से अधिक वार्तालाप हैं तो conversationId आवश्यक है।',
  'conversation.error.historyFailed': 'वार्तालाप इतिहास लोड करने में विफल',
  'conversation.error.readFailed': 'बातचीत को समझने में विफल रहा',
  'conversation.error.updateFailed': 'वार्तालाप को अपडेट करने में विफल',
}
