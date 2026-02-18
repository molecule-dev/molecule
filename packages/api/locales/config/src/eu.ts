import type { ConfigTranslations } from './types.js'

/** Config translations for Basque. */
export const eu: ConfigTranslations = {
  'config.error.required': "Beharrezko konfigurazioa '{{key}}' ez dago ezarrita.",
  'config.error.mustBeNumber': "Konfigurazioa '{{key}}' zenbaki bat izan behar da.",
  'config.error.minValue': "Konfigurazioa '{{key}}' gutxienez {{min}} izan behar da.",
  'config.error.maxValue': "Konfigurazioa '{{key}}' gehienez {{max}} izan behar da.",
  'config.error.mustBeBoolean':
    "Konfigurazioa '{{key}}' boolean bat izan behar da (true/false/1/0).",
  'config.error.mustBeJson': "Konfigurazioa '{{key}}' JSON baliozkoa izan behar da.",
  'config.error.patternMismatch': "Konfigurazioa '{{key}}' ez dator bat '{{pattern}}' ereduarekin.",
  'config.error.invalidEnum': "Konfigurazioa '{{key}}' hauetako bat izan behar da: {{values}}.",
  'config.error.validationNotSupported':
    'Uneko konfigurazio-hornitzaileak ez du balidazioa onartzen.',
}
