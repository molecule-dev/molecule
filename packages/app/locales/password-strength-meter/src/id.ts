import type { PasswordStrengthMeterTranslations } from './types.js'

/** PasswordStrengthMeter translations for id. */
export const id: Partial<PasswordStrengthMeterTranslations> = {
  'passwordStrengthMeter.rule.length': 'Setidaknya 12 karakter',
  'passwordStrengthMeter.label.0': 'Sangat lemah',
  'passwordStrengthMeter.label.1': 'Lemah',
  'passwordStrengthMeter.label.2': 'Adil',
  'passwordStrengthMeter.label.3': 'Bagus',
  'passwordStrengthMeter.label.4': 'Kuat',
  'passwordStrengthMeter.ariaValueText':
    'Kekuatan kata sandi:<x> {{label}}</x> (<x> {{skor}}</x> dari 4)',
  'passwordStrengthMeter.rule.upper': 'Mengandung huruf kapital',
  'passwordStrengthMeter.rule.lower': 'Mengandung huruf kecil',
  'passwordStrengthMeter.rule.digit': 'Berisi angka',
  'passwordStrengthMeter.rule.symbol': 'Berisi simbol',
  'passwordStrengthMeter.rule.noCommon': 'Bukan kata sandi umum',
}
