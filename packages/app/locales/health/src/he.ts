import type { HealthTranslations } from './types.js'

/** Health translations for Hebrew. */
export const he: HealthTranslations = {
  'health.durationHoursMinutes': '{{hours}}ש {{minutes}}ד',
  'health.durationMinutes': '{{minutes}}ד',
  'health.error.noProvider':
    '`@molecule/app-health`: אין ספק בריאות מחובר - יש ליישם את הממשק `HealthProvider` בזמן הריצה המקורי שלך (Apple HealthKit / Android Health Connect / Google Fit) ולקשר אותו עם `setProvider()` בעת ההפעלה. Molecule לא שולחת ספק עבורו. זיהוי תכונות באמצעות `hasProvider()` או `getCapabilities().supported` לפני הקריאה - לקריאת בריאות אין ברירת מחדל כנה, כך שהיא זורקת נתונים מזויפים במקום להחזיר אותם.',
}
