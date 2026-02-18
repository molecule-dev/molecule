import type { ConfigTranslations } from './types.js'

/** Config translations for Hungarian. */
export const hu: ConfigTranslations = {
  'config.error.required': "A kötelező '{{key}}' konfiguráció nincs beállítva.",
  'config.error.mustBeNumber': "A '{{key}}' konfigurációnak számnak kell lennie.",
  'config.error.minValue': "A '{{key}}' konfigurációnak legalább {{min}} értékűnek kell lennie.",
  'config.error.maxValue': "A '{{key}}' konfigurációnak legfeljebb {{max}} értékűnek kell lennie.",
  'config.error.mustBeBoolean':
    "A '{{key}}' konfigurációnak boolean értéknek kell lennie (true/false/1/0).",
  'config.error.mustBeJson': "A '{{key}}' konfigurációnak érvényes JSON-nek kell lennie.",
  'config.error.patternMismatch':
    "A '{{key}}' konfiguráció nem felel meg a '{{pattern}}' mintának.",
  'config.error.invalidEnum':
    "A '{{key}}' konfigurációnak a következők egyikének kell lennie: {{values}}.",
  'config.error.validationNotSupported':
    'A jelenlegi konfigurációszolgáltató nem támogatja az érvényesítést.',
}
