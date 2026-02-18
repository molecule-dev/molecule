import type { ConfigTranslations } from './types.js'

/** Config translations for Arabic. */
export const ar: ConfigTranslations = {
  'config.error.required': "الإعداد المطلوب '{{key}}' غير محدد.",
  'config.error.mustBeNumber': "الإعداد '{{key}}' يجب أن يكون رقمًا.",
  'config.error.minValue': "الإعداد '{{key}}' يجب أن يكون على الأقل {{min}}.",
  'config.error.maxValue': "الإعداد '{{key}}' يجب أن يكون على الأكثر {{max}}.",
  'config.error.mustBeBoolean': "الإعداد '{{key}}' يجب أن يكون قيمة منطقية (true/false/1/0).",
  'config.error.mustBeJson': "الإعداد '{{key}}' يجب أن يكون JSON صالحًا.",
  'config.error.patternMismatch': "الإعداد '{{key}}' لا يطابق النمط '{{pattern}}'.",
  'config.error.invalidEnum': "الإعداد '{{key}}' يجب أن يكون واحدًا من: {{values}}.",
  'config.error.validationNotSupported': 'موفر الإعدادات الحالي لا يدعم التحقق من الصحة.',
}
