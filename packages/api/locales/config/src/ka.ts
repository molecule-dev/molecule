import type { ConfigTranslations } from './types.js'

/** Config translations for Georgian. */
export const ka: ConfigTranslations = {
  'config.error.required': "საჭირო კონფიგურაცია '{{key}}' არ არის დაყენებული.",
  'config.error.mustBeNumber': "კონფიგურაცია '{{key}}' უნდა იყოს რიცხვი.",
  'config.error.minValue': "კონფიგურაცია '{{key}}' უნდა იყოს მინიმუმ {{min}}.",
  'config.error.maxValue': "კონფიგურაცია '{{key}}' უნდა იყოს მაქსიმუმ {{max}}.",
  'config.error.mustBeBoolean': "კონფიგურაცია '{{key}}' უნდა იყოს ბულის ტიპის (true/false/1/0).",
  'config.error.mustBeJson': "კონფიგურაცია '{{key}}' უნდა იყოს ვალიდური JSON.",
  'config.error.patternMismatch': "კონფიგურაცია '{{key}}' არ ემთხვევა შაბლონს '{{pattern}}'.",
  'config.error.invalidEnum': "კონფიგურაცია '{{key}}' უნდა იყოს ერთ-ერთი: {{values}}.",
  'config.error.validationNotSupported':
    'მიმდინარე კონფიგურაციის პროვაიდერი არ უჭერს მხარს ვალიდაციას.',
}
