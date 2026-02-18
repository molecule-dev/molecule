import type { ConfigTranslations } from './types.js'

/** Config translations for Sinhala. */
export const si: ConfigTranslations = {
  'config.error.required': "අවශ්‍ය වින්‍යාසය '{{key}}' සකසා නැත.",
  'config.error.mustBeNumber': "වින්‍යාසය '{{key}}' අංකයක් විය යුතුය.",
  'config.error.minValue': "වින්‍යාසය '{{key}}' අවම වශයෙන් {{min}} විය යුතුය.",
  'config.error.maxValue': "වින්‍යාසය '{{key}}' උපරිමයෙන් {{max}} විය යුතුය.",
  'config.error.mustBeBoolean': "වින්‍යාසය '{{key}}' බූලියන් විය යුතුය (true/false/1/0).",
  'config.error.mustBeJson': "වින්‍යාසය '{{key}}' වලංගු JSON විය යුතුය.",
  'config.error.patternMismatch': "වින්‍යාසය '{{key}}' රටාව '{{pattern}}' සමඟ නොගැලපේ.",
  'config.error.invalidEnum': "වින්‍යාසය '{{key}}' මෙයින් එකක් විය යුතුය: {{values}}.",
  'config.error.validationNotSupported': 'වත්මන් වින්‍යාස සපයන්නා වලංගුකරණය සඳහා සහාය නොදක්වයි.',
}
