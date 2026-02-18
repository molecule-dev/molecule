import type { ConfigTranslations } from './types.js'

/** Config translations for Malay. */
export const ms: ConfigTranslations = {
  'config.error.required': "Konfigurasi yang diperlukan '{{key}}' tidak ditetapkan.",
  'config.error.mustBeNumber': "Konfigurasi '{{key}}' mesti nombor.",
  'config.error.minValue': "Konfigurasi '{{key}}' mesti sekurang-kurangnya {{min}}.",
  'config.error.maxValue': "Konfigurasi '{{key}}' mesti paling banyak {{max}}.",
  'config.error.mustBeBoolean': "Konfigurasi '{{key}}' mesti boolean (true/false/1/0).",
  'config.error.mustBeJson': "Konfigurasi '{{key}}' mesti JSON yang sah.",
  'config.error.patternMismatch': "Konfigurasi '{{key}}' tidak sepadan dengan corak '{{pattern}}'.",
  'config.error.invalidEnum': "Konfigurasi '{{key}}' mesti salah satu daripada: {{values}}.",
  'config.error.validationNotSupported': 'Pembekal konfigurasi semasa tidak menyokong pengesahan.',
}
