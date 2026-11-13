import type { ChatTranslations } from './types.js'

/** Ai Chat translations for Urdu. */
export const ur: ChatTranslations = {
  'chat.error.httpError': 'HTTP {{status}}: {{text}}',
  'chat.error.noResponseBody': 'کوئی جواب باڈی نہیں',
  'chat.error.streamError': 'سٹریم خرابی',
  'chat.error.unknownError': 'نامعلوم خرابی',
  'chat.error.sendFailed': 'پیغام بھیجنے میں ناکام',
  'chat.error.stalled':
    '{{agentName}} نے جواب دینا بند کر دیا۔ یہ اب بھی پس منظر میں ختم ہو سکتا ہے — تازہ ترین دیکھنے کے لیے دوبارہ لوڈ کریں، یا نیا پیغام بھیجیں۔',
  'aiChat.error.noProvider':
    'AI چیٹ فراہم کنندہ کنفیگر نہیں ہے۔ پہلے ایک AI چیٹ فراہم کنندہ کو بانڈ کریں۔',
}
