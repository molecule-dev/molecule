import type { AiTranslations } from './types.js'

/** Ai translations for Hebrew. */
export const he: AiTranslations = {
  'ai.error.noProvider': 'ספק AI לא מוגדר. חבר ספק AI תחילה.',
  'ai.error.ambiguousProvider':
    'מספר ספקי AI בעלי שם מחוברים ולא הוגדר ספק ברירת מחדל. השתמש ב-getProviderByName(name) כדי לבחור אחד.',
  'ai.error.responseIncomplete': 'תגובת הבינה המלאכותית הסתיימה לפני השלמתה. אנא נסה שוב.',
  'ai.error.responseTokenLimit': 'תגובת הבינה המלאכותית הגיעה למגבלת אסימון הפלט לפני השלמתה.',
  'ai.error.apiError': 'שגיאת שירות בינה מלאכותית. אנא נסה שוב.',
  'ai.error.noResponseBody': 'אין תגובה משירות הבינה המלאכותית.',
}
