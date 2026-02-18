import type { ConfigTranslations } from './types.js'

/** Config translations for Russian. */
export const ru: ConfigTranslations = {
  'config.error.required': "Обязательная конфигурация '{{key}}' не задана.",
  'config.error.mustBeNumber': "Конфигурация '{{key}}' должна быть числом.",
  'config.error.minValue': "Конфигурация '{{key}}' должна быть не менее {{min}}.",
  'config.error.maxValue': "Конфигурация '{{key}}' должна быть не более {{max}}.",
  'config.error.mustBeBoolean':
    "Конфигурация '{{key}}' должна быть булевым значением (true/false/1/0).",
  'config.error.mustBeJson': "Конфигурация '{{key}}' должна быть допустимым JSON.",
  'config.error.patternMismatch': "Конфигурация '{{key}}' не соответствует шаблону '{{pattern}}'.",
  'config.error.invalidEnum': "Конфигурация '{{key}}' должна быть одной из: {{values}}.",
  'config.error.validationNotSupported':
    'Текущий провайдер конфигурации не поддерживает валидацию.',
}
