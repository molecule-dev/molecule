import type { ConfigTranslations } from './types.js'

/** Config translations for Amharic. */
export const am: ConfigTranslations = {
  'config.error.required': "የሚያስፈልገው ማዋቀሪያ '{{key}}' አልተዘጋጀም።",
  'config.error.mustBeNumber': "ማዋቀሪያ '{{key}}' ቁጥር መሆን አለበት።",
  'config.error.minValue': "ማዋቀሪያ '{{key}}' ቢያንስ {{min}} መሆን አለበት።",
  'config.error.maxValue': "ማዋቀሪያ '{{key}}' ቢበዛ {{max}} መሆን አለበት።",
  'config.error.mustBeBoolean': "ማዋቀሪያ '{{key}}' ቡሊያን መሆን አለበት (true/false/1/0)።",
  'config.error.mustBeJson': "ማዋቀሪያ '{{key}}' ትክክለኛ JSON መሆን አለበት።",
  'config.error.patternMismatch': "ማዋቀሪያ '{{key}}' ከንድፍ '{{pattern}}' ጋር አይዛመድም።",
  'config.error.invalidEnum': "ማዋቀሪያ '{{key}}' ከእነዚህ አንዱ መሆን አለበት: {{values}}።",
  'config.error.validationNotSupported': 'አሁን ያለው ማዋቀሪያ አቅራቢ ማረጋገጥን አይደግፍም።',
}
