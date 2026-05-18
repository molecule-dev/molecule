import type { PasswordStrengthMeterTranslations } from './types.js'

/** PasswordStrengthMeter translations for pl. */
export const pl: Partial<PasswordStrengthMeterTranslations> = {
  'passwordStrengthMeter.rule.length': 'Co najmniej 12 znaków',
  'passwordStrengthMeter.label.0': 'Bardzo słaby',
  'passwordStrengthMeter.label.1': 'Słaby',
  'passwordStrengthMeter.label.2': 'Sprawiedliwy',
  'passwordStrengthMeter.label.3': 'Dobry',
  'passwordStrengthMeter.label.4': 'Mocny',
  'passwordStrengthMeter.ariaValueText': 'Siła hasła:<x> {{etykieta}}</x> (<x> {{wynik}}</x> z 4)',
  'passwordStrengthMeter.rule.upper': 'Zawiera wielką literę',
  'passwordStrengthMeter.rule.lower': 'Zawiera małą literę',
  'passwordStrengthMeter.rule.digit': 'Zawiera cyfrę',
  'passwordStrengthMeter.rule.symbol': 'Zawiera symbol',
  'passwordStrengthMeter.rule.noCommon': 'Nie jest to popularne hasło',
}
