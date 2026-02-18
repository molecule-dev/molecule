import type { ConfigTranslations } from './types.js'

/** Config translations for Gujarati. */
export const gu: ConfigTranslations = {
  'config.error.required': "આવશ્યક રૂપરેખાંકન '{{key}}' સેટ નથી.",
  'config.error.mustBeNumber': "રૂપરેખાંકન '{{key}}' એક સંખ્યા હોવું જોઈએ.",
  'config.error.minValue': "રૂપરેખાંકન '{{key}}' ઓછામાં ઓછું {{min}} હોવું જોઈએ.",
  'config.error.maxValue': "રૂપરેખાંકન '{{key}}' વધુમાં વધુ {{max}} હોવું જોઈએ.",
  'config.error.mustBeBoolean': "રૂપરેખાંકન '{{key}}' બુલિયન હોવું જોઈએ (true/false/1/0).",
  'config.error.mustBeJson': "રૂપરેખાંકન '{{key}}' માન્ય JSON હોવું જોઈએ.",
  'config.error.patternMismatch': "રૂપરેખાંકન '{{key}}' પેટર્ન '{{pattern}}' સાથે મેળ ખાતું નથી.",
  'config.error.invalidEnum': "રૂપરેખાંકન '{{key}}' આમાંથી એક હોવું જોઈએ: {{values}}.",
  'config.error.validationNotSupported': 'વર્તમાન રૂપરેખાંકન પ્રદાતા માન્યતાને સમર્થન આપતું નથી.',
}
