import type { AiTranslations } from './types.js'

/** Ai translations for Persian. */
export const fa: AiTranslations = {
  'ai.error.noProvider':
    'ارائه‌دهنده هوش مصنوعی پیکربندی نشده است. ابتدا یک ارائه‌دهنده هوش مصنوعی را متصل کنید.',
  'ai.error.ambiguousProvider':
    'چندین ارائه‌دهنده هوش مصنوعی نام‌گذاری‌شده متصل شده‌اند و هیچ پیش‌فرضی تنظیم نشده است. برای انتخاب یکی از getProviderByName(name) استفاده کنید.',
  'ai.error.responseIncomplete':
    'پاسخ هوش مصنوعی قبل از تکمیل شدن، متوقف شد. لطفاً دوباره امتحان کنید.',
  'ai.error.responseTokenLimit': 'پاسخ هوش مصنوعی قبل از تکمیل به حد مجاز توکن خروجی رسید.',
  'ai.error.apiError': 'خطای سرویس هوش مصنوعی. لطفا دوباره امتحان کنید.',
  'ai.error.noResponseBody': 'هیچ پاسخی از سرویس هوش مصنوعی دریافت نشد.',
}
