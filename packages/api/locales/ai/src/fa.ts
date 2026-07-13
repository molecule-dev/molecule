import type { AiTranslations } from './types.js'

/** Ai translations for Persian. */
export const fa: AiTranslations = {
  'ai.error.noProvider':
    'ارائه‌دهنده هوش مصنوعی پیکربندی نشده است. ابتدا یک ارائه‌دهنده هوش مصنوعی را متصل کنید.',
  'ai.error.apiError': 'درخواست API هوش مصنوعی ناموفق بود.',
  'ai.error.noResponseBody': 'بدنه پاسخ هوش مصنوعی خالی است.',
  'ai.error.ambiguousProvider':
    'چندین ارائه‌دهنده هوش مصنوعی نام‌گذاری‌شده متصل شده‌اند و هیچ پیش‌فرضی تنظیم نشده است. برای انتخاب یکی از getProviderByName(name) استفاده کنید.',
}
