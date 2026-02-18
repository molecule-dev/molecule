import type { ConfigTranslations } from './types.js'

/** Config translations for Indonesian. */
export const id: ConfigTranslations = {
  'config.error.required': "Konfigurasi yang diperlukan '{{key}}' tidak diatur.",
  'config.error.mustBeNumber': "Konfigurasi '{{key}}' harus berupa angka.",
  'config.error.minValue': "Konfigurasi '{{key}}' harus setidaknya {{min}}.",
  'config.error.maxValue': "Konfigurasi '{{key}}' harus paling banyak {{max}}.",
  'config.error.mustBeBoolean': "Konfigurasi '{{key}}' harus berupa boolean (true/false/1/0).",
  'config.error.mustBeJson': "Konfigurasi '{{key}}' harus berupa JSON yang valid.",
  'config.error.patternMismatch': "Konfigurasi '{{key}}' tidak cocok dengan pola '{{pattern}}'.",
  'config.error.invalidEnum': "Konfigurasi '{{key}}' harus salah satu dari: {{values}}.",
  'config.error.validationNotSupported': 'Penyedia konfigurasi saat ini tidak mendukung validasi.',
}
