import type { ConfigTranslations } from './types.js'

/** Config translations for Romanian. */
export const ro: ConfigTranslations = {
  'config.error.required': "Configurația necesară '{{key}}' nu este setată.",
  'config.error.mustBeNumber': "Configurația '{{key}}' trebuie să fie un număr.",
  'config.error.minValue': "Configurația '{{key}}' trebuie să fie cel puțin {{min}}.",
  'config.error.maxValue': "Configurația '{{key}}' trebuie să fie cel mult {{max}}.",
  'config.error.mustBeBoolean':
    "Configurația '{{key}}' trebuie să fie un boolean (true/false/1/0).",
  'config.error.mustBeJson': "Configurația '{{key}}' trebuie să fie JSON valid.",
  'config.error.patternMismatch': "Configurația '{{key}}' nu corespunde modelului '{{pattern}}'.",
  'config.error.invalidEnum': "Configurația '{{key}}' trebuie să fie una dintre: {{values}}.",
  'config.error.validationNotSupported': 'Furnizorul de configurație curent nu acceptă validarea.',
}
