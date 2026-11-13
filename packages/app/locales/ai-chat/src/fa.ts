import type { ChatTranslations } from './types.js'

/** Ai Chat translations for Persian. */
export const fa: ChatTranslations = {
  'chat.error.httpError': 'HTTP {{status}}: {{text}}',
  'chat.error.noResponseBody': 'بدنه پاسخ موجود نیست',
  'chat.error.streamError': 'خطای جریان',
  'chat.error.unknownError': 'خطای نامشخص',
  'chat.error.sendFailed': 'ارسال پیام ناموفق بود',
  'chat.error.stalled':
    'ممکن است هنوز در پس‌زمینه در حال اتمام باشد — برای دیدن آخرین پیام، آن {{agentName}} دوباره بارگذاری کنید یا پیام جدیدی ارسال کنید.',
  'aiChat.error.noProvider':
    'ارائه دهنده چت هوش مصنوعی پیکربندی نشده است. ابتدا یک ارائه دهنده چت هوش مصنوعی را ثبت کنید.',
}
