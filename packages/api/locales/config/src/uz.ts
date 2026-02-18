import type { ConfigTranslations } from './types.js'

/** Config translations for Uzbek. */
export const uz: ConfigTranslations = {
  'config.error.required': "Talab qilinadigan konfiguratsiya '{{key}}' o'rnatilmagan.",
  'config.error.mustBeNumber': "Konfiguratsiya '{{key}}' raqam bo'lishi kerak.",
  'config.error.minValue': "Konfiguratsiya '{{key}}' kamida {{min}} bo'lishi kerak.",
  'config.error.maxValue': "Konfiguratsiya '{{key}}' ko'pi bilan {{max}} bo'lishi kerak.",
  'config.error.mustBeBoolean':
    "Konfiguratsiya '{{key}}' mantiqiy qiymat bo'lishi kerak (true/false/1/0).",
  'config.error.mustBeJson': "Konfiguratsiya '{{key}}' haqiqiy JSON bo'lishi kerak.",
  'config.error.patternMismatch':
    "Konfiguratsiya '{{key}}' naqsh '{{pattern}}' bilan mos kelmaydi.",
  'config.error.invalidEnum':
    "Konfiguratsiya '{{key}}' quyidagilardan biri bo'lishi kerak: {{values}}.",
  'config.error.validationNotSupported':
    "Joriy konfiguratsiya provayderi tekshirishni qo'llab-quvvatlamaydi.",
}
