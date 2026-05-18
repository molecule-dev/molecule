import type { PasswordStrengthMeterTranslations } from './types.js'

/** PasswordStrengthMeter translations for tr. */
export const tr: Partial<PasswordStrengthMeterTranslations> = {
  'passwordStrengthMeter.rule.length': 'En az 12 karakter',
  'passwordStrengthMeter.label.0': 'Çok zayıf',
  'passwordStrengthMeter.label.1': 'Zayıf',
  'passwordStrengthMeter.label.2': 'Adil',
  'passwordStrengthMeter.label.3': 'İyi',
  'passwordStrengthMeter.label.4': 'Güçlü',
  'passwordStrengthMeter.ariaValueText': 'Parola gücü:<x> {{etiket}}</x> (<x> {{Gol}}</x> 4)',
  'passwordStrengthMeter.rule.upper': 'Büyük harf içerir',
  'passwordStrengthMeter.rule.lower': 'Küçük harf içerir',
  'passwordStrengthMeter.rule.digit': 'Bir rakam içeriyor',
  'passwordStrengthMeter.rule.symbol': 'Bir sembol içerir.',
  'passwordStrengthMeter.rule.noCommon': 'Yaygın bir şifre değil',
}
