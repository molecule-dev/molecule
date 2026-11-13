import type { ChatTranslations } from './types.js'

/** Ai Chat translations for Marathi. */
export const mr: ChatTranslations = {
  'chat.error.httpError': 'HTTP {{status}}: {{text}}',
  'chat.error.noResponseBody': 'कोणताही प्रतिसाद बॉडी नाही',
  'chat.error.streamError': 'स्ट्रीम त्रुटी',
  'chat.error.unknownError': 'अज्ञात त्रुटी',
  'chat.error.sendFailed': 'संदेश पाठवण्यात अयशस्वी झाले.',
  'chat.error.stalled':
    '{{agentName}} प्रतिसाद देणे थांबवले आहे. कदाचित बॅकग्राउंडमध्ये प्रक्रिया पूर्ण होत असेल — नवीनतम माहिती पाहण्यासाठी रीलोड करा किंवा नवीन संदेश पाठवा.',
}
