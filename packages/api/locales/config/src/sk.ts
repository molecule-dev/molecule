import type { ConfigTranslations } from './types.js'

/** Config translations for Slovak. */
export const sk: ConfigTranslations = {
  'config.error.required': "Požadovaná konfigurácia '{{key}}' nie je nastavená.",
  'config.error.mustBeNumber': "Konfigurácia '{{key}}' musí byť číslo.",
  'config.error.minValue': "Konfigurácia '{{key}}' musí byť aspoň {{min}}.",
  'config.error.maxValue': "Konfigurácia '{{key}}' musí byť najviac {{max}}.",
  'config.error.mustBeBoolean': "Konfigurácia '{{key}}' musí byť boolean (true/false/1/0).",
  'config.error.mustBeJson': "Konfigurácia '{{key}}' musí byť platný JSON.",
  'config.error.patternMismatch': "Konfigurácia '{{key}}' nezodpovedá vzoru '{{pattern}}'.",
  'config.error.invalidEnum': "Konfigurácia '{{key}}' musí byť jedna z: {{values}}.",
  'config.error.validationNotSupported': 'Súčasný poskytovateľ konfigurácie nepodporuje validáciu.',
}
