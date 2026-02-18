import type { ConfigTranslations } from './types.js'

/** Config translations for Azerbaijani. */
export const az: ConfigTranslations = {
  'config.error.required': "Tələb olunan konfiqurasiya '{{key}}' təyin edilməyib.",
  'config.error.mustBeNumber': "Konfiqurasiya '{{key}}' rəqəm olmalıdır.",
  'config.error.minValue': "Konfiqurasiya '{{key}}' ən azı {{min}} olmalıdır.",
  'config.error.maxValue': "Konfiqurasiya '{{key}}' ən çox {{max}} olmalıdır.",
  'config.error.mustBeBoolean': "Konfiqurasiya '{{key}}' boolean olmalıdır (true/false/1/0).",
  'config.error.mustBeJson': "Konfiqurasiya '{{key}}' etibarlı JSON olmalıdır.",
  'config.error.patternMismatch': "Konfiqurasiya '{{key}}' '{{pattern}}' şablonuna uyğun gəlmir.",
  'config.error.invalidEnum': "Konfiqurasiya '{{key}}' bunlardan biri olmalıdır: {{values}}.",
  'config.error.validationNotSupported': 'Cari konfiqurasiya provayderi yoxlamanı dəstəkləmir.',
}
