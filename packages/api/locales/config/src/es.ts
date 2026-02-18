import type { ConfigTranslations } from './types.js'

/** Config translations for Spanish. */
export const es: ConfigTranslations = {
  'config.error.required': "La configuración requerida '{{key}}' no está establecida.",
  'config.error.mustBeNumber': "La configuración '{{key}}' debe ser un número.",
  'config.error.minValue': "La configuración '{{key}}' debe ser al menos {{min}}.",
  'config.error.maxValue': "La configuración '{{key}}' debe ser como máximo {{max}}.",
  'config.error.mustBeBoolean': "La configuración '{{key}}' debe ser un booleano (true/false/1/0).",
  'config.error.mustBeJson': "La configuración '{{key}}' debe ser JSON válido.",
  'config.error.patternMismatch':
    "La configuración '{{key}}' no coincide con el patrón '{{pattern}}'.",
  'config.error.invalidEnum': "La configuración '{{key}}' debe ser uno de: {{values}}.",
  'config.error.validationNotSupported':
    'El proveedor de configuración actual no admite validación.',
}
