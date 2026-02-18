import type { ConfigTranslations } from './types.js'

/** Config translations for German. */
export const de: ConfigTranslations = {
  'config.error.required': "Erforderliche Konfiguration '{{key}}' ist nicht gesetzt.",
  'config.error.mustBeNumber': "Konfiguration '{{key}}' muss eine Zahl sein.",
  'config.error.minValue': "Konfiguration '{{key}}' muss mindestens {{min}} sein.",
  'config.error.maxValue': "Konfiguration '{{key}}' darf höchstens {{max}} sein.",
  'config.error.mustBeBoolean': "Konfiguration '{{key}}' muss ein Boolean sein (true/false/1/0).",
  'config.error.mustBeJson': "Konfiguration '{{key}}' muss gültiges JSON sein.",
  'config.error.patternMismatch':
    "Konfiguration '{{key}}' entspricht nicht dem Muster '{{pattern}}'.",
  'config.error.invalidEnum':
    "Konfiguration '{{key}}' muss einer der folgenden Werte sein: {{values}}.",
  'config.error.validationNotSupported':
    'Der aktuelle Konfigurationsanbieter unterstützt keine Validierung.',
}
