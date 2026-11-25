import type { UploadsTranslations } from './types.js'

/** Uploads translations for Arabic. */
export const ar: UploadsTranslations = {
  'uploads.error.noProvider': 'لم يتم تكوين مزود الرفع. قم باستدعاء setProvider() أولاً.',
  'uploads.error.streamLimitReached': 'تم الوصول إلى حد التدفق.',
  'uploads.error.aborted': 'تم إلغاء الرفع.',
  'uploads.error.fileTypeBlocked': 'لا يمكن رفع ملفات من النوع {{type}}.',
  'uploads.error.activeTypeListed':
    'يسرد receiveUploads() النوع {{type}}، وهو نوع يشغّله المتصفح. مرّر allowActiveTypes: true لتخزينه، وقدّم تلك الملفات باستخدام sendUpload().',
}
