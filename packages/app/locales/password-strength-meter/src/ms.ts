import type { PasswordStrengthMeterTranslations } from './types.js'

/** PasswordStrengthMeter translations for ms. */
export const ms: Partial<PasswordStrengthMeterTranslations> = {
  'passwordStrengthMeter.rule.length': 'Sekurang-kurangnya 12 aksara',
  'passwordStrengthMeter.label.0': 'Sangat lemah',
  'passwordStrengthMeter.label.1': 'Lemah',
  'passwordStrengthMeter.label.2': 'Adil',
  'passwordStrengthMeter.label.3': 'Bagus',
  'passwordStrengthMeter.label.4': 'Kuat',
  'passwordStrengthMeter.ariaValueText':
    'Kekuatan kata laluan:<x> {{label}}</x> (<x> {{skor}}</x> daripada 4)',
  'passwordStrengthMeter.rule.upper': 'Mengandungi huruf besar',
  'passwordStrengthMeter.rule.lower': 'Mengandungi huruf kecil',
  'passwordStrengthMeter.rule.digit': 'Mengandungi satu digit',
  'passwordStrengthMeter.rule.symbol': 'Mengandungi simbol',
  'passwordStrengthMeter.rule.noCommon': 'Bukan kata laluan biasa',
}
