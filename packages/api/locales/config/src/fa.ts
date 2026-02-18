import type { ConfigTranslations } from './types.js'

/** Config translations for Persian. */
export const fa: ConfigTranslations = {
  'config.error.required': "پیکربندی مورد نیاز '{{key}}' تنظیم نشده است.",
  'config.error.mustBeNumber': "پیکربندی '{{key}}' باید یک عدد باشد.",
  'config.error.minValue': "پیکربندی '{{key}}' باید حداقل {{min}} باشد.",
  'config.error.maxValue': "پیکربندی '{{key}}' باید حداکثر {{max}} باشد.",
  'config.error.mustBeBoolean': "پیکربندی '{{key}}' باید یک مقدار بولی باشد (true/false/1/0).",
  'config.error.mustBeJson': "پیکربندی '{{key}}' باید JSON معتبر باشد.",
  'config.error.patternMismatch': "پیکربندی '{{key}}' با الگوی '{{pattern}}' مطابقت ندارد.",
  'config.error.invalidEnum': "پیکربندی '{{key}}' باید یکی از موارد زیر باشد: {{values}}.",
  'config.error.validationNotSupported':
    'ارائه‌دهنده پیکربندی فعلی از اعتبارسنجی پشتیبانی نمی‌کند.',
}
