import type { UploadsTranslations } from './types.js'

/** Uploads translations for Hebrew. */
export const he: UploadsTranslations = {
  'uploads.error.noProvider': 'ספק ההעלאה לא הוגדר. קרא ל-setProvider() תחילה.',
  'uploads.error.streamLimitReached': 'הגבלת הזרם הושגה.',
  'uploads.error.aborted': 'ההעלאה בוטלה.',
  'uploads.error.fileTypeBlocked': 'לא ניתן להעלות קבצים מסוג {{type}}.',
  'uploads.error.activeTypeListed':
    'receiveUploads() מפרט את {{type}}, סוג שדפדפן מריץ. העבירו allowActiveTypes: true כדי לשמור אותו, והגישו קבצים אלה באמצעות sendUpload().',
}
