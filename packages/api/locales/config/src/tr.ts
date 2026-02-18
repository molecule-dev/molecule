import type { ConfigTranslations } from './types.js'

/** Config translations for Turkish. */
export const tr: ConfigTranslations = {
  'config.error.required': "Gerekli yapılandırma '{{key}}' ayarlanmamış.",
  'config.error.mustBeNumber': "Yapılandırma '{{key}}' bir sayı olmalıdır.",
  'config.error.minValue': "Yapılandırma '{{key}}' en az {{min}} olmalıdır.",
  'config.error.maxValue': "Yapılandırma '{{key}}' en fazla {{max}} olmalıdır.",
  'config.error.mustBeBoolean':
    "Yapılandırma '{{key}}' bir boolean değer olmalıdır (true/false/1/0).",
  'config.error.mustBeJson': "Yapılandırma '{{key}}' geçerli bir JSON olmalıdır.",
  'config.error.patternMismatch': "Yapılandırma '{{key}}', '{{pattern}}' deseni ile eşleşmiyor.",
  'config.error.invalidEnum': "Yapılandırma '{{key}}' şunlardan biri olmalıdır: {{values}}.",
  'config.error.validationNotSupported':
    'Mevcut yapılandırma sağlayıcısı doğrulamayı desteklemiyor.',
}
