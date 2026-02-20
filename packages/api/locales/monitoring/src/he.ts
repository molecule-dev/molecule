import type { MonitoringTranslations } from './types.js'

/** Monitoring translations for Hebrew. */
export const he: MonitoringTranslations = {
  'monitoring.error.noProvider': 'ספק ניטור לא מוגדר. קראו ל-setProvider() תחילה.',
  'monitoring.check.database.notBonded': 'חיבור מסד נתונים לא מוגדר.',
  'monitoring.check.database.poolUnavailable': 'מאגר מסד הנתונים אינו זמין.',
  'monitoring.check.cache.notBonded': 'חיבור מטמון לא מוגדר.',
  'monitoring.check.cache.providerUnavailable': 'ספק המטמון אינו זמין.',
  'monitoring.check.http.badStatus': 'תגובת HTTP {{status}}.',
  'monitoring.check.http.timeout': 'הבקשה עברה את הזמן המוקצב.',
  'monitoring.check.http.degraded': 'זמן תגובה {{latencyMs}}ms חרג מהסף {{thresholdMs}}ms.',
  'monitoring.check.bond.notBonded': "החיבור '{{bondType}}' אינו רשום.",
  'monitoring.check.timedOut': 'הבדיקה פגה לאחר {{timeoutMs}}ms.',
}
