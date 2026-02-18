import type { ConfigTranslations } from './types.js'

/** Config translations for Czech. */
export const cs: ConfigTranslations = {
  'config.error.required': "Požadovaná konfigurace '{{key}}' není nastavena.",
  'config.error.mustBeNumber': "Konfigurace '{{key}}' musí být číslo.",
  'config.error.minValue': "Konfigurace '{{key}}' musí být alespoň {{min}}.",
  'config.error.maxValue': "Konfigurace '{{key}}' musí být nejvýše {{max}}.",
  'config.error.mustBeBoolean': "Konfigurace '{{key}}' musí být boolean (true/false/1/0).",
  'config.error.mustBeJson': "Konfigurace '{{key}}' musí být platný JSON.",
  'config.error.patternMismatch': "Konfigurace '{{key}}' neodpovídá vzoru '{{pattern}}'.",
  'config.error.invalidEnum': "Konfigurace '{{key}}' musí být jedna z: {{values}}.",
  'config.error.validationNotSupported': 'Současný poskytovatel konfigurace nepodporuje validaci.',
}
