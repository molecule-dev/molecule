import type { StatusTranslations } from './types.js'

/** Status translations for Hebrew. */
export const he: StatusTranslations = {
  'status.error.serviceNotFound': 'שירות לא נמצא.',
  'status.error.incidentNotFound': 'אירוע לא נמצא.',
  'status.error.validationFailed': 'אימות נכשל: {{errors}}',
  'status.error.createServiceFailed': 'יצירת שירות נכשלה.',
  'status.error.updateServiceFailed': 'עדכון שירות נכשל.',
  'status.error.deleteServiceFailed': 'מחיקת שירות נכשלה.',
  'status.error.getServiceFailed': 'שליפת שירות נכשלה.',
  'status.error.listServicesFailed': 'רישום שירותים נכשל.',
  'status.error.createIncidentFailed': 'יצירת אירוע נכשלה.',
  'status.error.updateIncidentFailed': 'עדכון אירוע נכשל.',
  'status.error.listIncidentsFailed': 'רישום אירועים נכשל.',
  'status.error.getStatusFailed': 'שליפת מצב המערכת נכשלה.',
  'status.error.getUptimeFailed': 'שליפת נתוני זמינות נכשלה.',
}
