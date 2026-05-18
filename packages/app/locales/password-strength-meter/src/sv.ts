import type { PasswordStrengthMeterTranslations } from './types.js'

/** PasswordStrengthMeter translations for sv. */
export const sv: Partial<PasswordStrengthMeterTranslations> = {
  'passwordStrengthMeter.rule.length': 'Minst 12 tecken',
  'passwordStrengthMeter.label.0': 'Mycket svag',
  'passwordStrengthMeter.label.1': 'Svag',
  'passwordStrengthMeter.label.2': 'Rättvis',
  'passwordStrengthMeter.label.3': 'Bra',
  'passwordStrengthMeter.label.4': 'Stark',
  'passwordStrengthMeter.ariaValueText':
    'Lösenordsstyrka:<x> {{märka}}</x> (<x> {{göra}}</x> av 4)',
  'passwordStrengthMeter.rule.upper': 'Innehåller en stor bokstav',
  'passwordStrengthMeter.rule.lower': 'Innehåller en liten bokstav',
  'passwordStrengthMeter.rule.digit': 'Innehåller en siffra',
  'passwordStrengthMeter.rule.symbol': 'Innehåller en symbol',
  'passwordStrengthMeter.rule.noCommon': 'Inte ett vanligt lösenord',
}
