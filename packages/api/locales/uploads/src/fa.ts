import type { UploadsTranslations } from './types.js'

/** Uploads translations for Persian. */
export const fa: UploadsTranslations = {
  'uploads.error.noProvider':
    'ارائه‌دهنده بارگذاری پیکربندی نشده است. ابتدا setProvider() را فراخوانی کنید.',
  'uploads.error.streamLimitReached': 'به حد جریان رسیده است.',
  'uploads.error.aborted': 'بارگذاری لغو شد.',
  'uploads.error.fileTypeBlocked': 'فایل‌هایی از نوع {{type}} را نمی‌توان بارگذاری کرد.',
  'uploads.error.activeTypeListed':
    'receiveUploads() نوع {{type}} را فهرست می‌کند، نوعی که مرورگر اجرا می‌کند. برای ذخیرهٔ آن allowActiveTypes: true را بدهید و آن فایل‌ها را با sendUpload() ارائه کنید.',
}
