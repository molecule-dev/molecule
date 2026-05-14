import type { PasswordStrengthMeterTranslations } from './types.js'

/** Password-strength-meter translations for Ukrainian. */
export const uk: PasswordStrengthMeterTranslations = {
  'passwordStrengthMeter.label.0': 'Дуже слабкий',
  'passwordStrengthMeter.label.1': 'Слабкий',
  'passwordStrengthMeter.label.2': 'Середній',
  'passwordStrengthMeter.label.3': 'Добрий',
  'passwordStrengthMeter.label.4': 'Надійний',
  'passwordStrengthMeter.ariaValueText': 'Надійність пароля: {{label}} ({{score}} з 4)',
  'passwordStrengthMeter.rule.length': 'Щонайменше 12 символів',
  'passwordStrengthMeter.rule.upper': 'Містить велику літеру',
  'passwordStrengthMeter.rule.lower': 'Містить малу літеру',
  'passwordStrengthMeter.rule.digit': 'Містить цифру',
  'passwordStrengthMeter.rule.symbol': 'Містить символ',
  'passwordStrengthMeter.rule.noCommon': 'Не поширений пароль',
}
