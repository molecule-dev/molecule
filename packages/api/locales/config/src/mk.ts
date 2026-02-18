import type { ConfigTranslations } from './types.js'

/** Config translations for Macedonian. */
export const mk: ConfigTranslations = {
  'config.error.required': "Задолжителната конфигурација '{{key}}' не е поставена.",
  'config.error.mustBeNumber': "Конфигурацијата '{{key}}' мора да биде број.",
  'config.error.minValue': "Конфигурацијата '{{key}}' мора да биде најмалку {{min}}.",
  'config.error.maxValue': "Конфигурацијата '{{key}}' мора да биде најмногу {{max}}.",
  'config.error.mustBeBoolean':
    "Конфигурацијата '{{key}}' мора да биде булова вредност (true/false/1/0).",
  'config.error.mustBeJson': "Конфигурацијата '{{key}}' мора да биде валиден JSON.",
  'config.error.patternMismatch':
    "Конфигурацијата '{{key}}' не се совпаѓа со шаблонот '{{pattern}}'.",
  'config.error.invalidEnum': "Конфигурацијата '{{key}}' мора да биде една од: {{values}}.",
  'config.error.validationNotSupported':
    'Тековниот провајдер на конфигурација не поддржува валидација.',
}
