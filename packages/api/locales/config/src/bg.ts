import type { ConfigTranslations } from './types.js'

/** Config translations for Bulgarian. */
export const bg: ConfigTranslations = {
  'config.error.required': "Задължителната конфигурация '{{key}}' не е зададена.",
  'config.error.mustBeNumber': "Конфигурацията '{{key}}' трябва да бъде число.",
  'config.error.minValue': "Конфигурацията '{{key}}' трябва да бъде поне {{min}}.",
  'config.error.maxValue': "Конфигурацията '{{key}}' трябва да бъде най-много {{max}}.",
  'config.error.mustBeBoolean':
    "Конфигурацията '{{key}}' трябва да бъде булева стойност (true/false/1/0).",
  'config.error.mustBeJson': "Конфигурацията '{{key}}' трябва да бъде валиден JSON.",
  'config.error.patternMismatch': "Конфигурацията '{{key}}' не съвпада с шаблона '{{pattern}}'.",
  'config.error.invalidEnum': "Конфигурацията '{{key}}' трябва да бъде една от: {{values}}.",
  'config.error.validationNotSupported':
    'Текущият доставчик на конфигурация не поддържа валидация.',
}
