import type { PasswordStrengthMeterTranslations } from './types.js'

/** Password-strength-meter translations for Swedish. */
export const sv: PasswordStrengthMeterTranslations = {
  'passwordStrengthMeter.label.0': 'Mycket svagt',
  'passwordStrengthMeter.label.1': 'Svagt',
  'passwordStrengthMeter.label.2': 'Hyfsat',
  'passwordStrengthMeter.label.3': 'Bra',
  'passwordStrengthMeter.label.4': 'Starkt',
  'passwordStrengthMeter.ariaValueText': 'Lösenordsstyrka: {{label}} ({{score}} av 4)',
  'passwordStrengthMeter.rule.length': 'Minst 12 tecken',
  'passwordStrengthMeter.rule.upper': 'Innehåller versal',
  'passwordStrengthMeter.rule.lower': 'Innehåller gemen',
  'passwordStrengthMeter.rule.digit': 'Innehåller en siffra',
  'passwordStrengthMeter.rule.symbol': 'Innehåller en symbol',
  'passwordStrengthMeter.rule.noCommon': 'Inte ett vanligt lösenord',
}
