import type { ConfigTranslations } from './types.js'

/** Config translations for Portuguese. */
export const pt: ConfigTranslations = {
  'config.error.required': "A configuração obrigatória '{{key}}' não está definida.",
  'config.error.mustBeNumber': "A configuração '{{key}}' deve ser um número.",
  'config.error.minValue': "A configuração '{{key}}' deve ser pelo menos {{min}}.",
  'config.error.maxValue': "A configuração '{{key}}' deve ser no máximo {{max}}.",
  'config.error.mustBeBoolean': "A configuração '{{key}}' deve ser um booleano (true/false/1/0).",
  'config.error.mustBeJson': "A configuração '{{key}}' deve ser um JSON válido.",
  'config.error.patternMismatch':
    "A configuração '{{key}}' não corresponde ao padrão '{{pattern}}'.",
  'config.error.invalidEnum': "A configuração '{{key}}' deve ser um dos seguintes: {{values}}.",
  'config.error.validationNotSupported': 'O provedor de configuração atual não suporta validação.',
}
