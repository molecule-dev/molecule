import type { AiTranslations } from './types.js'

/** Ai translations for Hebrew. */
export const he: AiTranslations = {
  'ai.error.noProvider': 'ספק AI לא מוגדר. חבר ספק AI תחילה.',
  'ai.error.apiError': 'בקשת API של AI נכשלה.',
  'ai.error.noResponseBody': 'גוף תגובת AI ריק.',
  'ai.error.ambiguousProvider':
    'מספר ספקי AI בעלי שם מחוברים ולא הוגדר ספק ברירת מחדל. השתמש ב-getProviderByName(name) כדי לבחור אחד.',
}
