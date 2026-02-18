import type { ConfigTranslations } from './types.js'

/** Config translations for Galician. */
export const gl: ConfigTranslations = {
  'config.error.required': "A configuración requirida '{{key}}' non está establecida.",
  'config.error.mustBeNumber': "A configuración '{{key}}' debe ser un número.",
  'config.error.minValue': "A configuración '{{key}}' debe ser polo menos {{min}}.",
  'config.error.maxValue': "A configuración '{{key}}' debe ser como máximo {{max}}.",
  'config.error.mustBeBoolean': "A configuración '{{key}}' debe ser un booleano (true/false/1/0).",
  'config.error.mustBeJson': "A configuración '{{key}}' debe ser JSON válido.",
  'config.error.patternMismatch': "A configuración '{{key}}' non coincide co patrón '{{pattern}}'.",
  'config.error.invalidEnum': "A configuración '{{key}}' debe ser un de: {{values}}.",
  'config.error.validationNotSupported':
    'O provedor de configuración actual non admite validación.',
}
