import type { ConfigTranslations } from './types.js'

/** Config translations for Zulu. */
export const zu: ConfigTranslations = {
  'config.error.required': "Ukucushwa okudingekayo '{{key}}' akubekwanga.",
  'config.error.mustBeBoolean': "Ukucushwa '{{key}}' kufanele kube i-boolean (true/false/1/0).",
  'config.error.mustBeJson': "Ukucushwa '{{key}}' kufanele kube i-JSON evumelekile.",
  'config.error.mustBeNumber': "Ukucushwa '{{key}}' kufanele kube inombolo.",
  'config.error.minValue': "Ukucushwa '{{key}}' kufanele kube okungenani {{min}}.",
  'config.error.maxValue': "Ukucushwa '{{key}}' kufanele kube ngaphansi kuka {{max}}.",
  'config.error.patternMismatch': "Ukucushwa '{{key}}' akufani nephethini '{{pattern}}'.",
  'config.error.invalidEnum': "Ukucushwa '{{key}}' kufanele kube okunye kwalokhu: {{values}}.",
  'config.error.validationNotSupported': 'Umhlinzeki wokucushwa wamanje akweseki ukuqinisekiswa.',
}
