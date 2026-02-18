import type { ConfigTranslations } from './types.js'

/** Config translations for Kazakh. */
export const kk: ConfigTranslations = {
  'config.error.required': "Қажетті конфигурация '{{key}}' орнатылмаған.",
  'config.error.mustBeNumber': "Конфигурация '{{key}}' сан болуы керек.",
  'config.error.minValue': "Конфигурация '{{key}}' кемінде {{min}} болуы керек.",
  'config.error.maxValue': "Конфигурация '{{key}}' көбінесе {{max}} болуы керек.",
  'config.error.mustBeBoolean':
    "Конфигурация '{{key}}' логикалық мән болуы керек (true/false/1/0).",
  'config.error.mustBeJson': "Конфигурация '{{key}}' жарамды JSON болуы керек.",
  'config.error.patternMismatch': "Конфигурация '{{key}}' үлгімен '{{pattern}}' сәйкес келмейді.",
  'config.error.invalidEnum': "Конфигурация '{{key}}' мыналардың бірі болуы керек: {{values}}.",
  'config.error.validationNotSupported': 'Ағымдағы конфигурация провайдері тексеруді қолдамайды.',
}
