import type { ConfigTranslations } from './types.js'

/** Config translations for Belarusian. */
export const be: ConfigTranslations = {
  'config.error.required': "Неабходная канфігурацыя '{{key}}' не ўстаноўлена.",
  'config.error.mustBeNumber': "Канфігурацыя '{{key}}' павінна быць лікам.",
  'config.error.minValue': "Канфігурацыя '{{key}}' павінна быць не менш {{min}}.",
  'config.error.maxValue': "Канфігурацыя '{{key}}' павінна быць не больш {{max}}.",
  'config.error.mustBeBoolean':
    "Канфігурацыя '{{key}}' павінна быць булевым значэннем (true/false/1/0).",
  'config.error.mustBeJson': "Канфігурацыя '{{key}}' павінна быць сапраўдным JSON.",
  'config.error.patternMismatch': "Канфігурацыя '{{key}}' не адпавядае шаблону '{{pattern}}'.",
  'config.error.invalidEnum': "Канфігурацыя '{{key}}' павінна быць адным з: {{values}}.",
  'config.error.validationNotSupported': 'Бягучы правайдэр канфігурацыі не падтрымлівае праверку.',
}
