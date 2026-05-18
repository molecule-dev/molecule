import type { PasswordStrengthMeterTranslations } from './types.js'

/** PasswordStrengthMeter translations for fil. */
export const fil: Partial<PasswordStrengthMeterTranslations> = {
  'passwordStrengthMeter.rule.length': 'Hindi bababa sa 12 character',
  'passwordStrengthMeter.label.0': 'Napakahina',
  'passwordStrengthMeter.label.1': 'Mahina',
  'passwordStrengthMeter.label.2': 'Makatarungan',
  'passwordStrengthMeter.label.3': 'Mabuti',
  'passwordStrengthMeter.label.4': 'Malakas',
  'passwordStrengthMeter.ariaValueText':
    'Lakas ng password:<x> {{label}}</x> (<x> {{iskor}}</x> ng 4)',
  'passwordStrengthMeter.rule.upper': 'Naglalaman ng malaking titik',
  'passwordStrengthMeter.rule.lower': 'Naglalaman ng maliit na titik',
  'passwordStrengthMeter.rule.digit': 'Naglalaman ng isang digit',
  'passwordStrengthMeter.rule.symbol': 'Naglalaman ng simbolo',
  'passwordStrengthMeter.rule.noCommon': 'Hindi isang karaniwang password',
}
