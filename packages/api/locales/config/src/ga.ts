import type { ConfigTranslations } from './types.js'

/** Config translations for Irish. */
export const ga: ConfigTranslations = {
  'config.error.required': "Níl an cumraíocht riachtanach '{{key}}' socraithe.",
  'config.error.mustBeNumber': "Caithfidh an chumraíocht '{{key}}' a bheith ina uimhir.",
  'config.error.minValue': "Caithfidh an chumraíocht '{{key}}' a bheith ar a laghad {{min}}.",
  'config.error.maxValue': "Ní mór don chumraíocht '{{key}}' a bheith ar a mhéad {{max}}.",
  'config.error.mustBeBoolean':
    "Caithfidh an chumraíocht '{{key}}' a bheith ina Boole (true/false/1/0).",
  'config.error.mustBeJson': "Caithfidh an chumraíocht '{{key}}' a bheith ina JSON bailí.",
  'config.error.patternMismatch':
    "Ní mheaitseálann an chumraíocht '{{key}}' leis an bpatrún '{{pattern}}'.",
  'config.error.invalidEnum':
    "Caithfidh an chumraíocht '{{key}}' a bheith ar cheann de: {{values}}.",
  'config.error.validationNotSupported':
    'Ní thacaíonn an soláthraí cumraíochta reatha le bailíochtú.',
}
