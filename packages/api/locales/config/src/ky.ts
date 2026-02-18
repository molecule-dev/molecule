import type { ConfigTranslations } from './types.js'

/** Config translations for Kyrgyz. */
export const ky: ConfigTranslations = {
  'config.error.required': "Талап кылынган конфигурация '{{key}}' коюлган эмес.",
  'config.error.mustBeNumber': "Конфигурация '{{key}}' сан болушу керек.",
  'config.error.minValue': "Конфигурация '{{key}}' кеминде {{min}} болушу керек.",
  'config.error.maxValue': "Конфигурация '{{key}}' көп дегенде {{max}} болушу керек.",
  'config.error.mustBeBoolean':
    "Конфигурация '{{key}}' логикалык маани болушу керек (true/false/1/0).",
  'config.error.mustBeJson': "Конфигурация '{{key}}' туура JSON болушу керек.",
  'config.error.patternMismatch': "Конфигурация '{{key}}' үлгү '{{pattern}}' менен дал келбейт.",
  'config.error.invalidEnum': "Конфигурация '{{key}}' төмөнкүлөрдөн бири болушу керек: {{values}}.",
  'config.error.validationNotSupported': 'Учурдагы конфигурация провайдери текшерүүнү колдобойт.',
}
