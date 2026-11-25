import type { UploadsTranslations } from './types.js'

/** Uploads translations for Urdu. */
export const ur: UploadsTranslations = {
  'uploads.error.noProvider': 'اپ لوڈ فراہم کنندہ ترتیب نہیں دیا گیا۔ پہلے setProvider() کال کریں۔',
  'uploads.error.streamLimitReached': 'سٹریم کی حد پوری ہو گئی۔',
  'uploads.error.aborted': 'اپ لوڈ منسوخ کر دیا گیا۔',
  'uploads.error.fileTypeBlocked': '{{type}} قسم کی فائلیں اپ لوڈ نہیں کی جا سکتیں۔',
  'uploads.error.activeTypeListed':
    'receiveUploads() میں {{type}} درج ہے، ایسی قسم جسے براؤزر چلاتا ہے۔ اسے محفوظ کرنے کے لیے allowActiveTypes: true دیں، اور وہ فائلیں sendUpload() سے پیش کریں۔',
}
