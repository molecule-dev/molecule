import type { PasswordStrengthMeterTranslations } from './types.js'

/** Password-strength-meter translations for Bulgarian. */
export const bg: PasswordStrengthMeterTranslations = {
  'passwordStrengthMeter.label.0': 'Много слаба',
  'passwordStrengthMeter.label.1': 'Слаба',
  'passwordStrengthMeter.label.2': 'Средна',
  'passwordStrengthMeter.label.3': 'Добра',
  'passwordStrengthMeter.label.4': 'Силна',
  'passwordStrengthMeter.ariaValueText': 'Сила на паролата: {{label}} ({{score}} от 4)',
  'passwordStrengthMeter.rule.length': 'Поне 12 знака',
  'passwordStrengthMeter.rule.upper': 'Съдържа главна буква',
  'passwordStrengthMeter.rule.lower': 'Съдържа малка буква',
  'passwordStrengthMeter.rule.digit': 'Съдържа цифра',
  'passwordStrengthMeter.rule.symbol': 'Съдържа символ',
  'passwordStrengthMeter.rule.noCommon': 'Не е често срещана парола',
}
