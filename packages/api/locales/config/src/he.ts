import type { ConfigTranslations } from './types.js'

/** Config translations for Hebrew. */
export const he: ConfigTranslations = {
  'config.error.required': "התצורה הנדרשת '{{key}}' אינה מוגדרת.",
  'config.error.mustBeNumber': "התצורה '{{key}}' חייבת להיות מספר.",
  'config.error.minValue': "התצורה '{{key}}' חייבת להיות לפחות {{min}}.",
  'config.error.maxValue': "התצורה '{{key}}' חייבת להיות לכל היותר {{max}}.",
  'config.error.mustBeBoolean': "התצורה '{{key}}' חייבת להיות ערך בוליאני (true/false/1/0).",
  'config.error.mustBeJson': "התצורה '{{key}}' חייבת להיות JSON תקין.",
  'config.error.patternMismatch': "התצורה '{{key}}' אינה תואמת את התבנית '{{pattern}}'.",
  'config.error.invalidEnum': "התצורה '{{key}}' חייבת להיות אחת מהאפשרויות: {{values}}.",
  'config.error.validationNotSupported': 'ספק התצורה הנוכחי אינו תומך באימות.',
}
