import type { PasswordStrengthMeterTranslations } from './types.js'

/** PasswordStrengthMeter translations for uk. */
export const uk: Partial<PasswordStrengthMeterTranslations> = {
  'passwordStrengthMeter.rule.length': 'Щонайменше 12 символів',
  'passwordStrengthMeter.label.0': 'Дуже слабкий',
  'passwordStrengthMeter.label.1': 'Слабкий',
  'passwordStrengthMeter.label.2': 'Справедливий',
  'passwordStrengthMeter.label.3': 'Добре',
  'passwordStrengthMeter.label.4': 'Сильний',
  'passwordStrengthMeter.ariaValueText':
    'Надійність пароля:<x> {{мітка}}</x> (<x> {{оцінка}}</x> з 4)',
  'passwordStrengthMeter.rule.upper': 'Містить велику літеру',
  'passwordStrengthMeter.rule.lower': 'Містить малу літеру',
  'passwordStrengthMeter.rule.digit': 'Містить цифру',
  'passwordStrengthMeter.rule.symbol': 'Містить символ',
  'passwordStrengthMeter.rule.noCommon': 'Не поширений пароль',
}
