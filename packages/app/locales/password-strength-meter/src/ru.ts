import type { PasswordStrengthMeterTranslations } from './types.js'

/** Password-strength-meter translations for Russian. */
export const ru: PasswordStrengthMeterTranslations = {
  'passwordStrengthMeter.label.0': 'Очень слабый',
  'passwordStrengthMeter.label.1': 'Слабый',
  'passwordStrengthMeter.label.2': 'Средний',
  'passwordStrengthMeter.label.3': 'Хороший',
  'passwordStrengthMeter.label.4': 'Надёжный',
  'passwordStrengthMeter.ariaValueText': 'Надёжность пароля: {{label}} ({{score}} из 4)',
  'passwordStrengthMeter.rule.length': 'Не менее 12 символов',
  'passwordStrengthMeter.rule.upper': 'Содержит заглавную букву',
  'passwordStrengthMeter.rule.lower': 'Содержит строчную букву',
  'passwordStrengthMeter.rule.digit': 'Содержит цифру',
  'passwordStrengthMeter.rule.symbol': 'Содержит символ',
  'passwordStrengthMeter.rule.noCommon': 'Не распространённый пароль',
}
