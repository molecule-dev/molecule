import type { ConfigTranslations } from './types.js'

/** Config translations for Ukrainian. */
export const uk: ConfigTranslations = {
  'config.error.required': "Обов'язкова конфігурація '{{key}}' не встановлена.",
  'config.error.mustBeNumber': "Конфігурація '{{key}}' має бути числом.",
  'config.error.minValue': "Конфігурація '{{key}}' має бути не менше {{min}}.",
  'config.error.maxValue': "Конфігурація '{{key}}' має бути не більше {{max}}.",
  'config.error.mustBeBoolean':
    "Конфігурація '{{key}}' має бути булевим значенням (true/false/1/0).",
  'config.error.mustBeJson': "Конфігурація '{{key}}' має бути дійсним JSON.",
  'config.error.patternMismatch': "Конфігурація '{{key}}' не відповідає шаблону '{{pattern}}'.",
  'config.error.invalidEnum': "Конфігурація '{{key}}' має бути одним із: {{values}}.",
  'config.error.validationNotSupported': 'Поточний провайдер конфігурації не підтримує валідацію.',
}
