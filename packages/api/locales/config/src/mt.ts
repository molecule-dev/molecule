import type { ConfigTranslations } from './types.js'

/** Config translations for Maltese. */
export const mt: ConfigTranslations = {
  'config.error.required': "Il-konfigurazzjoni mehtiega '{{key}}' mhix issettjata.",
  'config.error.mustBeNumber': "Il-konfigurazzjoni '{{key}}' trid tkun numru.",
  'config.error.minValue': "Il-konfigurazzjoni '{{key}}' trid tkun mill-inqas {{min}}.",
  'config.error.maxValue': "Il-konfigurazzjoni '{{key}}' trid tkun l-iktar {{max}}.",
  'config.error.mustBeBoolean': "Il-konfigurazzjoni '{{key}}' trid tkun boolean (true/false/1/0).",
  'config.error.mustBeJson': "Il-konfigurazzjoni '{{key}}' trid tkun JSON validu.",
  'config.error.patternMismatch':
    "Il-konfigurazzjoni '{{key}}' ma taqbilx mal-mudell '{{pattern}}'.",
  'config.error.invalidEnum': "Il-konfigurazzjoni '{{key}}' trid tkun wahda minn: {{values}}.",
  'config.error.validationNotSupported':
    'Il-fornitur attwali tal-konfigurazzjoni ma jappoggjiax il-validazzjoni.',
}
